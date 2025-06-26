import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

export interface SoundConfig {
  volume?: number;
  shouldPlay?: boolean;
  isLooping?: boolean;
}

export interface GameSounds {
  // UI Sounds
  buttonClick: any;
  tabSwitch: any;
  notification: any;
  success: any;
  error: any;
  
  // Battle Sounds
  battleStart: any;
  battleWin: any;
  battleLose: any;
  cardPlay: any;
  attack: any;
  heal: any;
  shield: any;
  
  // Pet Sounds
  petHappy: any;
  petSad: any;
  petEating: any;
  petLevelUp: any;
  
  // Feeding Sounds
  scanSuccess: any;
  mealComplete: any;
  nutritionGain: any;
  
  // Ambient/Background
  backgroundMusic: any;
  menuMusic: any;
}

class SoundManager {
  private sounds: Partial<GameSounds> = {};
  private isEnabled: boolean = true;
  private musicVolume: number = 0.3;
  private effectsVolume: number = 0.7;
  private backgroundMusic: Audio.Sound | null = null;
  private isBackgroundMusicPlaying: boolean = false;

  constructor() {
    this.initializeAudio();
  }

  private async initializeAudio() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.warn('Failed to initialize audio:', error);
    }
  }

  // Load all game sounds
  async loadSounds() {
    try {
      // For now, we'll use system sounds and synthesized audio
      // In production, you'd load actual sound files from assets/sounds/
      
      // Note: Since we don't have actual sound files yet, 
      // this will be a placeholder implementation
      console.log('Sound loading initialized - ready for actual sound files');
      
      // Example of how you'd load actual sound files:
      // this.sounds.buttonClick = await Audio.Sound.createAsync(
      //   require('@/assets/sounds/button-click.mp3')
      // );
      
    } catch (error) {
      console.warn('Failed to load sounds:', error);
    }
  }

  // Play a sound effect with haptic feedback
  async playSound(soundName: keyof GameSounds, config: SoundConfig = {}) {
    if (!this.isEnabled) return;

    try {
      // For now, we'll use haptic feedback as audio placeholders
      // and log what sound would be played
      console.log(`🔊 Playing sound: ${soundName}`);
      
      // Add appropriate haptic feedback based on sound type
      switch (soundName) {
        case 'buttonClick':
        case 'tabSwitch':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
          
        case 'cardPlay':
        case 'attack':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
          
        case 'battleStart':
        case 'battleWin':
        case 'battleLose':
        case 'petLevelUp':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
          
        case 'success':
        case 'scanSuccess':
        case 'mealComplete':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
          
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
          
        case 'notification':
        case 'nutritionGain':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
          
        default:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // When you have actual sound files, uncomment this:
      /*
      const sound = this.sounds[soundName];
      if (sound?.sound) {
        await sound.sound.replayAsync();
        await sound.sound.setVolumeAsync(config.volume || this.effectsVolume);
      }
      */
      
    } catch (error) {
      console.warn(`Failed to play sound ${soundName}:`, error);
    }
  }

  // Background music control
  async playBackgroundMusic(musicName: keyof GameSounds = 'backgroundMusic') {
    if (!this.isEnabled || this.isBackgroundMusicPlaying) return;

    try {
      console.log(`🎵 Starting background music: ${musicName}`);
      this.isBackgroundMusicPlaying = true;
      
      // When you have actual music files, implement here:
      /*
      const music = this.sounds[musicName];
      if (music?.sound) {
        this.backgroundMusic = music.sound;
        await this.backgroundMusic.setIsLoopingAsync(true);
        await this.backgroundMusic.setVolumeAsync(this.musicVolume);
        await this.backgroundMusic.playAsync();
      }
      */
    } catch (error) {
      console.warn('Failed to play background music:', error);
      this.isBackgroundMusicPlaying = false;
    }
  }

  async stopBackgroundMusic() {
    if (this.backgroundMusic && this.isBackgroundMusicPlaying) {
      try {
        await this.backgroundMusic.stopAsync();
        this.isBackgroundMusicPlaying = false;
        console.log('🎵 Background music stopped');
      } catch (error) {
        console.warn('Failed to stop background music:', error);
      }
    }
  }

  async pauseBackgroundMusic() {
    if (this.backgroundMusic && this.isBackgroundMusicPlaying) {
      try {
        await this.backgroundMusic.pauseAsync();
        console.log('🎵 Background music paused');
      } catch (error) {
        console.warn('Failed to pause background music:', error);
      }
    }
  }

  async resumeBackgroundMusic() {
    if (this.backgroundMusic && !this.isBackgroundMusicPlaying) {
      try {
        await this.backgroundMusic.playAsync();
        this.isBackgroundMusicPlaying = true;
        console.log('🎵 Background music resumed');
      } catch (error) {
        console.warn('Failed to resume background music:', error);
      }
    }
  }

  // Volume controls
  setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.backgroundMusic) {
      this.backgroundMusic.setVolumeAsync(this.musicVolume);
    }
  }

  setEffectsVolume(volume: number) {
    this.effectsVolume = Math.max(0, Math.min(1, volume));
  }

  // Enable/disable all sounds
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stopBackgroundMusic();
    }
  }

  getEnabled(): boolean {
    return this.isEnabled;
  }

  getMusicVolume(): number {
    return this.musicVolume;
  }

  getEffectsVolume(): number {
    return this.effectsVolume;
  }

  // Cleanup
  async cleanup() {
    try {
      await this.stopBackgroundMusic();
      
      // Unload all sounds
      for (const [key, sound] of Object.entries(this.sounds)) {
        if (sound?.sound) {
          await sound.sound.unloadAsync();
        }
      }
      
      this.sounds = {};
      console.log('Sound manager cleaned up');
    } catch (error) {
      console.warn('Failed to cleanup sound manager:', error);
    }
  }
}

// Export singleton instance
export const soundManager = new SoundManager();

// Utility functions for common game actions
export const GameAudio = {
  // UI Actions
  buttonPress: () => soundManager.playSound('buttonClick'),
  tabSwitch: () => soundManager.playSound('tabSwitch'),
  success: () => soundManager.playSound('success'),
  error: () => soundManager.playSound('error'),
  notification: () => soundManager.playSound('notification'),

  // Battle Actions
  battleStart: () => soundManager.playSound('battleStart'),
  battleWin: () => soundManager.playSound('battleWin'),
  battleLose: () => soundManager.playSound('battleLose'),
  cardPlay: () => soundManager.playSound('cardPlay'),
  attack: () => soundManager.playSound('attack'),
  heal: () => soundManager.playSound('heal'),
  shield: () => soundManager.playSound('shield'),

  // Pet Actions
  petHappy: () => soundManager.playSound('petHappy'),
  petSad: () => soundManager.playSound('petSad'),
  petEating: () => soundManager.playSound('petEating'),
  petLevelUp: () => soundManager.playSound('petLevelUp'),

  // Feeding Actions
  scanSuccess: () => soundManager.playSound('scanSuccess'),
  mealComplete: () => soundManager.playSound('mealComplete'),
  nutritionGain: () => soundManager.playSound('nutritionGain'),

  // Music Control
  startBackgroundMusic: () => soundManager.playBackgroundMusic(),
  stopBackgroundMusic: () => soundManager.stopBackgroundMusic(),
  pauseBackgroundMusic: () => soundManager.pauseBackgroundMusic(),
  resumeBackgroundMusic: () => soundManager.resumeBackgroundMusic(),
}; 