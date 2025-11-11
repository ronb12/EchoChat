# 🎬 Watch Tests Run in Browser

## How to Run Tests in Visible Mode

The responsive tests can now run with the browser visible so you can watch them execute!

### Quick Start

```bash
# Run tests with visible browser (you can watch!)
npm run test:responsive:watch
```

Or:

```bash
# Using environment variable
HEADLESS=false npm run test:responsive
```

### What You'll See

When running in visible mode, you'll see:

1. **Browser Window Opens** - A Chrome/Chromium window will open
2. **Auto-Login** - Browser automatically clicks "Try Demo" button
3. **Viewport Changes** - Browser resizes to test different screen sizes:
   - Very Small Mobile (360px)
   - Small Mobile (480px)
   - Mobile (768px)
   - Tablet (1024px)
   - Desktop (1440px)
   - Large Desktop (1920px)
   - Mobile Landscape (800px)
4. **Visual Feedback** - You can see:
   - Layout changes at different sizes
   - Responsive breakpoints in action
   - Sidebar showing/hiding
   - Mobile menu toggles
   - All UI elements rendering

### Test Flow

For each viewport, the test will:

1. 🔐 **Login** - Automatically login as demo user
2. 📏 **Resize** - Set browser to specific viewport size
3. 📸 **Screenshot** - Capture the layout
4. ✅ **Test** - Verify all responsive elements
5. ⏱️ **Pause** - 2-second pause so you can observe
6. ➡️ **Next** - Move to next viewport

### Console Output

You'll see detailed progress in the terminal:

```
📊 Progress: 1/8 viewports
📱 Testing very-small-mobile (360x640)...
  🔐 Attempting to login as demo user...
  ✅ Successfully logged in as demo user
  👁️  Testing very-small-mobile - Watch the browser!
  ✅ Main container exists
  ✅ Viewport width: 360px
  ...
  ✅ Completed very-small-mobile - Moving to next viewport...
```

### Browser Features in Visible Mode

- **DevTools Open** - Developer tools are automatically opened
- **Full Window** - Browser uses full screen size
- **Real-time Updates** - See layout changes as tests run
- **Screenshot Indicators** - Watch screenshots being taken

### Timing

- **Headless Mode**: Fast (default) - ~30 seconds total
- **Visible Mode**: Slower but watchable - ~60 seconds total
  - 3 seconds per login
  - 2 seconds pause between viewports
  - Extra render waits

### Tips

1. **Watch the Sidebar** - See it hide on mobile, show on desktop
2. **Check Menu Toggle** - See hamburger menu appear on small screens
3. **Observe Layouts** - Watch how chat area adapts to screen size
4. **Touch Targets** - Verify buttons are appropriately sized
5. **Breakpoints** - See media queries activate at different sizes

### Troubleshooting

If browser doesn't open:
- Make sure you're using `HEADLESS=false` or `npm run test:responsive:watch`
- Check that Chrome/Chromium is installed
- Try running with: `PUPPETEER_EXECUTABLE_PATH=/path/to/chrome HEADLESS=false npm run test:responsive`

### Summary

**Visible Mode Benefits:**
- ✅ See tests running in real-time
- ✅ Visual verification of responsive design
- ✅ Better debugging of layout issues
- ✅ Confidence in test results
- ✅ Educational - see how responsive design works

**Command:**
```bash
npm run test:responsive:watch
```

Enjoy watching your app get tested! 🎉


