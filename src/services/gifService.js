// GIF Search Service (using Giphy API)
class GifService {
  constructor() {
    this.apiKey = import.meta.env.VITE_GIPHY_API_KEY || 'demo_key'; // Use demo key by default
    this.baseUrl = 'https://api.giphy.com/v1/gifs';
  }

  async searchGifs(query, limit = 25) {
    try {
      // Use demo endpoint if no API key
      if (this.apiKey === 'demo_key') {
        // Return demo GIFs
        return this.getDemoGifs();
      }

      const response = await fetch(
        `${this.baseUrl}/search?api_key=${this.apiKey}&q=${encodeURIComponent(query)}&limit=${limit}&rating=g`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch GIFs');
      }

      const data = await response.json();
      return data.data.map(gif => ({
        id: gif.id,
        url: gif.images.fixed_height.url,
        preview: gif.images.fixed_height_small.url,
        title: gif.title,
        width: gif.images.fixed_height.width,
        height: gif.images.fixed_height.height
      }));
    } catch (error) {
      console.error('Error searching GIFs:', error);
      // Return demo GIFs on error
      return this.getDemoGifs();
    }
  }

  async getTrendingGifs(limit = 25) {
    try {
      if (this.apiKey === 'demo_key') {
        return this.getDemoGifs();
      }

      const response = await fetch(
        `${this.baseUrl}/trending?api_key=${this.apiKey}&limit=${limit}&rating=g`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch trending GIFs');
      }

      const data = await response.json();
      return data.data.map(gif => ({
        id: gif.id,
        url: gif.images.fixed_height.url,
        preview: gif.images.fixed_height_small.url,
        title: gif.title,
        width: gif.images.fixed_height.width,
        height: gif.images.fixed_height.height
      }));
    } catch (error) {
      console.error('Error fetching trending GIFs:', error);
      return this.getDemoGifs();
    }
  }

  getDemoGifs() {
    // Demo GIFs for testing
    return [
      {
        id: 'demo1',
        url: 'https://media.giphy.com/media/3o7aCTPPm4OHfRLSH6/giphy.gif',
        preview: 'https://media.giphy.com/media/3o7aCTPPm4OHfRLSH6/100.gif',
        title: 'Happy',
        width: 480,
        height: 270
      },
      {
        id: 'demo2',
        url: 'https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif',
        preview: 'https://media.giphy.com/media/l0MYC0LajbaPoEADu/100.gif',
        title: 'Celebration',
        width: 480,
        height: 270
      }
    ];
  }
}

export const gifService = new GifService();
export default gifService;

