// Group Polls Service - Create and manage polls in group chats
import { db } from './firebaseConfig';
import { collection, doc, addDoc, updateDoc, getDoc, getDocs, query, where, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { chatService } from './chatService';

class GroupPollsService {
  constructor() {
    this.maxOptions = 10;
    this.minOptions = 2;
  }

  formatPollSnapshot(snapshot) {
    if (!snapshot || !snapshot.exists()) {
      return null;
    }
    const data = snapshot.data() || {};
    const settings = data.settings || {};
    const options = Array.isArray(data.options) ? data.options : [];

    const formattedOptions = options.map((opt, index) => {
      const votesArray = Array.isArray(opt?.votes) ? opt.votes : [];
      const voteCount = typeof opt?.voteCount === 'number' ? opt.voteCount : votesArray.length;
      return {
        id: opt?.id || `opt_${index}`,
        text: opt?.text || '',
        votes: votesArray,
        voteCount
      };
    });

    const totalVotes = typeof data.totalVotes === 'number'
      ? data.totalVotes
      : formattedOptions.reduce((sum, opt) => sum + (typeof opt.voteCount === 'number' ? opt.voteCount : 0), 0);

    return {
      id: snapshot.id,
      ...data,
      options: formattedOptions,
      totalVotes,
      voters: Array.isArray(data.voters) ? data.voters : [],
      createdAt: data.createdAt?.toMillis?.() || null,
      updatedAt: data.updatedAt?.toMillis?.() || null,
      settings: {
        allowMultipleChoices: !!settings.allowMultipleChoices,
        allowAddOptions: !!settings.allowAddOptions,
        anonymous: !!settings.anonymous,
        expiresAt: settings.expiresAt?.toMillis?.() || null
      },
      isActive: data.isActive !== false
    };
  }

  // Create a poll
  async createPoll(chatId, userId, senderName, question, options, settings = {}) {
    try {
      // Validate poll data
      if (!question || question.trim().length === 0) {
        throw new Error('Poll question is required');
      }

      if (!options || options.length < this.minOptions || options.length > this.maxOptions) {
        throw new Error(`Poll must have between ${this.minOptions} and ${this.maxOptions} options`);
      }

      // Remove empty options
      const validOptions = options.filter(opt => opt && opt.trim().length > 0);
      if (validOptions.length < this.minOptions) {
        throw new Error(`Poll must have at least ${this.minOptions} valid options`);
      }

      // Create poll data
      const pollData = {
        chatId,
        question: question.trim(),
        options: validOptions.map((opt, index) => ({
          id: `opt_${index}`,
          text: opt.trim(),
          votes: [],
          voteCount: 0
        })),
        createdBy: userId,
        createdByName: senderName,
        createdAt: serverTimestamp(),
        totalVotes: 0,
        voters: [], // Track who has voted
        settings: {
          allowMultipleChoices: settings.allowMultipleChoices || false,
          allowAddOptions: settings.allowAddOptions || false,
          anonymous: settings.anonymous || false,
          expiresAt: settings.expiresAt || null
        },
        isActive: true
      };

      // Save poll to Firestore
      const pollRef = await addDoc(collection(db, 'polls'), pollData);

      // Create message for the poll
      const messageData = {
        senderId: userId,
        senderName: senderName,
        text: `📊 Poll: ${question}`,
        pollId: pollRef.id,
        isPoll: true,
        timestamp: Date.now()
      };

      // Send poll message via chatService
      const message = await chatService.sendMessage(chatId, messageData, userId);

      return {
        pollId: pollRef.id,
        messageId: message.id,
        ...pollData
      };
    } catch (error) {
      console.error('Error creating poll:', error);
      throw error;
    }
  }

  // Vote on a poll option
  async votePoll(pollId, optionId, userId, userName, isAddingVote = true) {
    try {
      const pollRef = doc(db, 'polls', pollId);
      const pollDoc = await getDoc(pollRef);

      if (!pollDoc.exists()) {
        throw new Error('Poll not found');
      }

      const poll = pollDoc.data();

      // Check if poll is active
      if (!poll.isActive) {
        throw new Error('Poll is no longer active');
      }

      // Check if poll has expired
      if (poll.settings.expiresAt) {
        const expiresAt = poll.settings.expiresAt.toMillis();
        if (Date.now() > expiresAt) {
          await updateDoc(pollRef, { isActive: false });
          throw new Error('Poll has expired');
        }
      }

      // Check if user already voted (for single-choice polls)
      if (!poll.settings.allowMultipleChoices && poll.voters.includes(userId)) {
        throw new Error('You have already voted on this poll');
      }

      // Find the option
      const optionIndex = poll.options.findIndex(opt => opt.id === optionId);
      if (optionIndex === -1) {
        throw new Error('Poll option not found');
      }

      const option = poll.options[optionIndex];

      if (isAddingVote) {
        // Check if user already voted on this option
        if (option.votes.includes(userId)) {
          throw new Error('You have already voted for this option');
        }

        // Add vote
        poll.options[optionIndex].votes.push(userId);
        poll.options[optionIndex].voteCount += 1;
        poll.totalVotes += 1;

        // Add to voters list if not already there
        if (!poll.voters.includes(userId)) {
          poll.voters.push(userId);
        }
      } else {
        // Remove vote
        const voteIndex = option.votes.indexOf(userId);
        if (voteIndex > -1) {
          poll.options[optionIndex].votes.splice(voteIndex, 1);
          poll.options[optionIndex].voteCount -= 1;
          poll.totalVotes -= 1;

          // Remove from voters if no more votes
          if (!poll.options.some(opt => opt.votes.includes(userId))) {
            poll.voters = poll.voters.filter(id => id !== userId);
          }
        }
      }

      await updateDoc(pollRef, {
        options: poll.options,
        totalVotes: poll.totalVotes,
        voters: poll.voters,
        updatedAt: serverTimestamp()
      });

      const updatedSnapshot = await getDoc(pollRef);
      return this.formatPollSnapshot(updatedSnapshot);
    } catch (error) {
      console.error('Error voting on poll:', error);
      throw error;
    }
  }

  // Get poll data
  async getPoll(pollId) {
    try {
      const pollRef = doc(db, 'polls', pollId);
      const pollDoc = await getDoc(pollRef);

      if (!pollDoc.exists()) {
        throw new Error('Poll not found');
      }

      return this.formatPollSnapshot(pollDoc);
    } catch (error) {
      console.error('Error getting poll:', error);
      throw error;
    }
  }

  // Get all polls for a chat
  async getChatPolls(chatId) {
    try {
      const pollsRef = collection(db, 'polls');
      const q = query(
        pollsRef,
        where('chatId', '==', chatId),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(q);

      const polls = [];
      snapshot.forEach(docSnap => {
        const formatted = this.formatPollSnapshot(docSnap);
        if (formatted) {
          polls.push(formatted);
        }
      });

      return polls;
    } catch (error) {
      console.error('Error getting chat polls:', error);
      return [];
    }
  }

  // Close a poll (mark as inactive)
  async closePoll(pollId, userId) {
    try {
      const pollRef = doc(db, 'polls', pollId);
      const pollDoc = await getDoc(pollRef);

      if (!pollDoc.exists()) {
        throw new Error('Poll not found');
      }

      const poll = pollDoc.data();

      // Only creator or admin can close poll
      if (poll.createdBy !== userId) {
        throw new Error('Only poll creator can close the poll');
      }

      await updateDoc(pollRef, {
        isActive: false,
        closedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error closing poll:', error);
      throw error;
    }
  }

  subscribeToPoll(pollId, onUpdate, onError) {
    if (!pollId) {
      return () => {};
    }
    const pollRef = doc(db, 'polls', pollId);
    return onSnapshot(pollRef, (snapshot) => {
      const formatted = this.formatPollSnapshot(snapshot);
      onUpdate(formatted);
    }, (error) => {
      console.error('Error subscribing to poll:', error);
      if (onError) {
        onError(error);
      }
    });
  }

  // Get poll results (with vote percentages)
  async getPollResults(pollId) {
    try {
      const poll = await this.getPoll(pollId);
      if (!poll) {
        throw new Error('Poll not found');
      }

      const results = poll.options.map(option => ({
        ...option,
        percentage: poll.totalVotes > 0
          ? Math.round((option.voteCount / poll.totalVotes) * 100)
          : 0
      }));

      return {
        question: poll.question,
        totalVotes: poll.totalVotes,
        options: results,
        createdAt: poll.createdAt,
        expiresAt: poll.settings.expiresAt
      };
    } catch (error) {
      console.error('Error getting poll results:', error);
      throw error;
    }
  }
}

export const groupPollsService = new GroupPollsService();
export default groupPollsService;
