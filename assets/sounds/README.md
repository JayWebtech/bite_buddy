# 🔊 BiteBuddy Game Sound Assets

This directory contains all audio files for the BiteBuddy game. Currently, the game uses haptic feedback as placeholders, but you can add actual sound files here.

## 📁 Required Sound Files

### UI Sounds
- `button-click.mp3` - Button press feedback
- `tab-switch.mp3` - Tab navigation sound
- `notification.mp3` - General notification sound
- `success.mp3` - Success/achievement sound
- `error.mp3` - Error/failure sound

### Battle Sounds
- `battle-start.mp3` - Battle initiation sound
- `battle-win.mp3` - Victory fanfare
- `battle-lose.mp3` - Defeat sound
- `card-play.mp3` - Playing a card/move
- `attack.mp3` - Attack move sound
- `heal.mp3` - Healing/restoration sound
- `shield.mp3` - Defense/shield sound

### Pet Sounds
- `pet-happy.mp3` - Pet satisfaction/joy
- `pet-sad.mp3` - Pet disappointment
- `pet-eating.mp3` - Eating/feeding sound
- `pet-levelup.mp3` - Level up celebration

### Feeding/Scan Sounds
- `scan-success.mp3` - Successful food scan
- `meal-complete.mp3` - Meal feeding completion
- `nutrition-gain.mp3` - Nutrition/XP gain

### Background Music
- `background-music.mp3` - Main game background music
- `menu-music.mp3` - Menu/lobby background music

## 🎵 Recommended Sound Specifications

- **Format**: MP3 or M4A
- **Sample Rate**: 44.1 kHz
- **Bit Rate**: 128-320 kbps
- **Duration**: 0.2-3 seconds for effects, 30+ seconds for music
- **Volume**: Normalized to -12dB to -6dB peak

## 🔗 Free Sound Resources

### Recommended Websites:
1. **Freesound.org** - Creative Commons licensed sounds
2. **Zapsplat.com** - Professional game audio (free account)
3. **Mixkit.co** - Free game audio library
4. **Pixabay Audio** - Royalty-free sounds
5. **Adobe Audition** - Free sound effects library

### Search Keywords:
- **UI**: "button click", "pop", "click", "tap", "beep"
- **Battle**: "sword clash", "magic spell", "victory fanfare", "defeat"
- **Pet**: "cute animal", "purr", "happy", "eating", "level up"
- **Scan**: "scanner beep", "camera shutter", "success chime"

## 🛠️ How to Add Sound Files

1. Download your chosen sound files
2. Rename them according to the naming convention above
3. Place them in this `assets/sounds/` directory
4. Update the `soundManager.ts` file to load actual sounds:

```typescript
// Example of loading actual sound files
async loadSounds() {
  try {
    this.sounds.buttonClick = await Audio.Sound.createAsync(
      require('@/assets/sounds/button-click.mp3')
    );
    this.sounds.battleStart = await Audio.Sound.createAsync(
      require('@/assets/sounds/battle-start.mp3')
    );
    // Add more sounds...
  } catch (error) {
    console.warn('Failed to load sounds:', error);
  }
}
```

5. Uncomment the actual sound playback code in `soundManager.ts`

## 🎮 Current Implementation

The game currently uses:
- **Haptic feedback** as audio placeholders
- **Console logging** to show which sounds would play
- **Sound system architecture** ready for actual audio files

## 🔧 Customization

You can customize:
- **Volume levels** via `setMusicVolume()` and `setEffectsVolume()`
- **Enable/disable** sounds via `setEnabled()`
- **Individual sound configs** by modifying the `SoundConfig` interface

## 📱 Platform Notes

- **iOS**: Sounds will play even in silent mode due to audio configuration
- **Android**: Respects system volume and Do Not Disturb settings
- **Web**: Limited to browser audio capabilities

## 🎯 Next Steps

1. Choose and download appropriate sound files
2. Test all sounds in the game
3. Adjust volume levels for balance
4. Consider adding background music
5. Add sound settings to user preferences

---

**Need help?** Check the `utils/soundManager.ts` file for implementation details or create an issue if you encounter problems. 