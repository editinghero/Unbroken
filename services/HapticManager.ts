import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export enum HapticIntensity {
  Light = 'light',
  Medium = 'medium',
  Heavy = 'heavy'
}

export enum HapticType {
  Navigation = 'navigation',
  CheckIn = 'checkIn',
  Calendar = 'calendar',
  Button = 'button',
  Success = 'success',
  Error = 'error',
  Removal = 'removal',
  Selection = 'selection'
}

interface HapticConfig {
  [HapticType.Navigation]: HapticIntensity;
  [HapticType.CheckIn]: HapticIntensity;
  [HapticType.Calendar]: HapticIntensity;
  [HapticType.Button]: HapticIntensity;
  [HapticType.Success]: HapticIntensity;
  [HapticType.Error]: HapticIntensity;
  [HapticType.Removal]: HapticIntensity;
  [HapticType.Selection]: HapticIntensity;
}

class HapticManager {
  private static instance: HapticManager;
  private isSupported: boolean = true;
  private isEnabled: boolean = true;

  private config: HapticConfig = {
    [HapticType.Navigation]: HapticIntensity.Light,
    [HapticType.CheckIn]: HapticIntensity.Heavy,
    [HapticType.Calendar]: HapticIntensity.Light,
    [HapticType.Button]: HapticIntensity.Light,
    [HapticType.Success]: HapticIntensity.Heavy,
    [HapticType.Error]: HapticIntensity.Medium,
    [HapticType.Removal]: HapticIntensity.Medium,
    [HapticType.Selection]: HapticIntensity.Light,
  };

  private constructor() {
    this.checkSupport();
  }

  public static getInstance(): HapticManager {
    if (!HapticManager.instance) {
      HapticManager.instance = new HapticManager();
    }
    return HapticManager.instance;
  }

  private async checkSupport(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        this.isSupported = false;
        return;
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      this.isSupported = true;
    } catch (error) {
      console.warn('Haptic feedback not supported on this device:', error);
      this.isSupported = false;
    }
  }

  public isHapticSupported(): boolean {
    return this.isSupported;
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public isHapticEnabled(): boolean {
    return this.isEnabled && this.isSupported;
  }

  private getHapticStyle(intensity: HapticIntensity): Haptics.ImpactFeedbackStyle {
    switch (intensity) {
      case HapticIntensity.Light:
        return Haptics.ImpactFeedbackStyle.Light;
      case HapticIntensity.Medium:
        return Haptics.ImpactFeedbackStyle.Medium;
      case HapticIntensity.Heavy:
        return Haptics.ImpactFeedbackStyle.Heavy;
      default:
        return Haptics.ImpactFeedbackStyle.Light;
    }
  }

  public async trigger(type: HapticType): Promise<void> {
    if (!this.isHapticEnabled()) {
      return;
    }

    try {
      const intensity = this.config[type];
      const hapticStyle = this.getHapticStyle(intensity);
      await Haptics.impactAsync(hapticStyle);
    } catch (error) {
      console.warn(`Failed to trigger haptic feedback for ${type}:`, error);
    }
  }

  public async triggerNavigation(): Promise<void> {
    return this.trigger(HapticType.Navigation);
  }

  public async triggerCheckIn(): Promise<void> {
    return this.trigger(HapticType.CheckIn);
  }

  public async triggerCalendar(): Promise<void> {
    return this.trigger(HapticType.Calendar);
  }

  public async triggerButton(): Promise<void> {
    return this.trigger(HapticType.Button);
  }

  public async triggerSuccess(): Promise<void> {
    return this.trigger(HapticType.Success);
  }

  public async triggerError(): Promise<void> {
    return this.trigger(HapticType.Error);
  }

  public async triggerRemoval(): Promise<void> {
    return this.trigger(HapticType.Removal);
  }

  public async triggerSelection(): Promise<void> {
    return this.trigger(HapticType.Selection);
  }

  public async triggerDoubleSuccess(): Promise<void> {
    if (!this.isHapticEnabled()) {
      return;
    }

    try {
      await this.triggerSuccess();
      setTimeout(async () => {
        await this.trigger(HapticType.Success);
      }, 100);
    } catch (error) {
      console.warn('Failed to trigger double success haptic:', error);
    }
  }

  public async triggerNotificationFeedback(type: 'success' | 'warning' | 'error'): Promise<void> {
    if (!this.isHapticEnabled()) {
      return;
    }

    try {
      let notificationType: Haptics.NotificationFeedbackType;

      switch (type) {
        case 'success':
          notificationType = Haptics.NotificationFeedbackType.Success;
          break;
        case 'warning':
          notificationType = Haptics.NotificationFeedbackType.Warning;
          break;
        case 'error':
          notificationType = Haptics.NotificationFeedbackType.Error;
          break;
        default:
          notificationType = Haptics.NotificationFeedbackType.Success;
      }

      await Haptics.notificationAsync(notificationType);
    } catch (error) {
      console.warn(`Failed to trigger notification haptic for ${type}:`, error);
    }
  }

  public async triggerSelectionChanged(): Promise<void> {
    if (!this.isHapticEnabled()) {
      return;
    }

    try {
      await Haptics.selectionAsync();
    } catch (error) {
      console.warn('Failed to trigger selection changed haptic:', error);
    }
  }

  public updateConfig(type: HapticType, intensity: HapticIntensity): void {
    this.config[type] = intensity;
  }

  public getConfig(): HapticConfig {
    return { ...this.config };
  }

  public resetConfig(): void {
    this.config = {
      [HapticType.Navigation]: HapticIntensity.Light,
      [HapticType.CheckIn]: HapticIntensity.Heavy,
      [HapticType.Calendar]: HapticIntensity.Light,
      [HapticType.Button]: HapticIntensity.Light,
      [HapticType.Success]: HapticIntensity.Heavy,
      [HapticType.Error]: HapticIntensity.Medium,
      [HapticType.Removal]: HapticIntensity.Medium,
      [HapticType.Selection]: HapticIntensity.Light,
    };
  }
}

export default HapticManager;