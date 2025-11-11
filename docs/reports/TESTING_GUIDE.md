# EchoChat - Mobile & Desktop Testing Guide

## 🚀 Quick Start

### Start Local Development Server

```bash
npm run dev
```

The app will be available at: **http://localhost:5173** (or the port shown in terminal)

---

## 📱 Testing Mobile Views

### Method 1: Browser DevTools (Recommended)

1. **Open the app in your browser** (http://localhost:5173)
2. **Open Developer Tools:**
   - Chrome/Edge: `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Firefox: `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Safari: `Cmd+Option+I` (Mac)

3. **Toggle Device Toolbar:**
   - Chrome/Edge: `Cmd+Shift+M` (Mac) / `Ctrl+Shift+M` (Windows)
   - Firefox: Click the device icon in toolbar
   - Safari: Use Responsive Design Mode

4. **Select Device Presets:**
   - iPhone SE (375px)
   - iPhone 12/13 Pro (390px)
   - iPhone 14 Pro Max (430px)
   - Pixel 5 (393px)
   - Samsung Galaxy S20 (360px)
   - iPad Mini (768px)
   - iPad Pro (1024px)

5. **Or Set Custom Dimensions:**
   - Very Small Mobile: 360px
   - Small Mobile: 480px
   - Mobile: 768px
   - Tablet: 768px - 1023px
   - Desktop: 1024px+

### Method 2: Real Mobile Devices

1. **Find your local IP address:**
   ```bash
   # Mac/Linux
   ifconfig | grep "inet "
   
   # Windows
   ipconfig
   ```
   Look for your local network IP (usually 192.168.x.x)

2. **Access from mobile device:**
   - Ensure phone and computer are on same WiFi
   - Open browser on phone
   - Go to: `http://YOUR_IP:5173`
   - Example: `http://192.168.1.100:5173`

3. **Update Vite config** (if needed):
   Add to `vite.config.js`:
   ```javascript
   server: {
     host: '0.0.0.0', // Allow external access
     port: 5173
   }
   ```

---

## 🖥️ Testing Desktop Views

### Desktop Breakpoints Tested:

1. **Small Desktop (1024px - 1439px)**
   - Tablet landscape
   - Small laptop screens

2. **Standard Desktop (1440px+)**
   - Large monitors
   - Wide displays

3. **Ultra Wide (1920px+)**
   - 4K displays
   - Multi-monitor setups

### Browser Testing Checklist:

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (Mac)
- ✅ Edge (latest)

---

## 📐 Responsive Breakpoints

The app uses these breakpoints:

```css
/* Very Small Mobile */
@media (max-width: 360px)

/* Small Mobile */
@media (max-width: 480px)

/* Mobile */
@media (max-width: 768px)

/* Tablet Portrait */
@media (min-width: 768px) and (max-width: 1023px)

/* Tablet Landscape / Desktop */
@media (min-width: 1024px) and (max-width: 1439px)

/* Large Desktop */
@media (min-width: 1440px)

/* Mobile Landscape */
@media (max-height: 500px) and (orientation: landscape)

/* Touch Devices */
@media (hover: none) and (pointer: coarse)
```

---

## 🧪 Testing Checklist

### Mobile (< 768px)
- [ ] Sidebar toggles on hamburger menu
- [ ] Messages fit screen width
- [ ] Input area is accessible
- [ ] Buttons are touch-friendly (44px min)
- [ ] Modals are full-screen or responsive
- [ ] Status bar doesn't overlap content
- [ ] Keyboard doesn't cover input
- [ ] Scrolling works smoothly
- [ ] Images scale properly
- [ ] Call modal works in fullscreen

### Tablet (768px - 1023px)
- [ ] Sidebar can be visible or hidden
- [ ] Chat area uses available space
- [ ] Two-column layout works
- [ ] Touch targets appropriate
- [ ] Landscape orientation works

### Desktop (1024px+)
- [ ] Sidebar always visible
- [ ] Three-panel layout (sidebar, chat, info)
- [ ] Hover states work
- [ ] Keyboard shortcuts function
- [ ] Wide screens use max-width container
- [ ] Multi-column layouts work

### All Devices
- [ ] Theme switching works
- [ ] Dark/Light mode renders correctly
- [ ] Text is readable at all sizes
- [ ] Icons scale properly
- [ ] Forms are usable
- [ ] Loading states visible
- [ ] Error messages display
- [ ] Notifications appear correctly

---

## 🔍 Feature-Specific Tests

### Video/Voice Calls
- [ ] Call modal displays correctly on mobile
- [ ] Camera permissions requested
- [ ] Fullscreen call interface works
- [ ] Controls accessible on all devices

### File Sharing
- [ ] File picker works on mobile
- [ ] Image previews display correctly
- [ ] File size validation shows
- [ ] Upload progress visible

### Status Updates
- [ ] Status modal is responsive
- [ ] Emoji picker fits screen
- [ ] Form inputs are accessible

### Settings
- [ ] Settings modal responsive
- [ ] All options accessible
- [ ] Forms usable on mobile

### Message Features
- [ ] Context menu accessible
- [ ] Reactions easy to tap
- [ ] Emoji picker works
- [ ] GIF picker responsive

---

## 🐛 Common Issues to Watch For

1. **Overflow Issues**
   - Content extending beyond viewport
   - Horizontal scrolling on mobile
   - Fixed width elements breaking layout

2. **Touch Target Size**
   - Buttons too small (< 44px)
   - Close buttons hard to tap
   - Links too close together

3. **Keyboard Issues**
   - Input covered by keyboard
   - Focus lost when keyboard appears
   - Viewport height changes

4. **Performance**
   - Slow scrolling
   - Laggy animations
   - Large images loading slowly

5. **Accessibility**
   - Text too small to read
   - Poor contrast
   - Missing labels

---

## 🛠️ Debugging Tools

### Chrome DevTools
- **Network tab**: Test slow connections
- **Performance tab**: Check frame rates
- **Lighthouse**: Run mobile audit
- **Console**: Check for errors

### Responsive Design Mode
- **Throttling**: Test slow CPU/network
- **Touch simulation**: Test touch events
- **Device presets**: Quick device switching

---

## 📊 Performance Testing

### Network Conditions
Test with:
- **Fast 3G**: Check loading times
- **Slow 3G**: Test offline fallbacks
- **Offline**: Verify PWA features

### Device Performance
- **Throttle CPU**: Simulate older devices
- **Frame rates**: Ensure 60fps scrolling
- **Memory**: Check for leaks

---

## ✅ Quick Test Commands

```bash
# Start dev server
npm run dev

# Build for production (test production build)
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint

# Check bundle size
npm run build && du -sh dist/
```

---

## 📱 Real Device Testing

### iOS Testing
1. Connect iPhone/iPad to Mac
2. Enable Web Inspector in Safari settings
3. Open Safari on Mac → Develop → [Your Device]
4. Inspect and debug

### Android Testing
1. Enable USB debugging
2. Connect via USB
3. Use Chrome DevTools → More tools → Remote devices
4. Inspect and debug

---

## 🎯 Key Testing Scenarios

### Scenario 1: Mobile Chat Flow
1. Open app on mobile
2. Create new chat
3. Send message
4. Share image
5. Make voice call
6. Check all responsive

### Scenario 2: Tablet Usage
1. Open app on tablet
2. Test landscape/portrait
3. Sidebar visibility
4. Multi-tasking support

### Scenario 3: Desktop Workflow
1. Open on desktop
2. Use keyboard shortcuts
3. Test multi-window
4. Check hover states
5. Verify wide screen layout

---

## 📝 Notes

- Always test on real devices when possible
- Use browser DevTools as primary testing tool
- Test in both portrait and landscape
- Verify touch interactions work
- Check all breakpoints systematically
- Test with slow connections
- Verify PWA features work offline

---

**Happy Testing!** 🚀

For issues, check:
- Browser console for errors
- Network tab for failed requests
- Responsive design mode for layout issues
- Performance tab for slowdowns


