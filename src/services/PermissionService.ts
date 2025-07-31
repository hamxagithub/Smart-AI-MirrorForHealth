/**
 * Permission Service
 * Handles all permission requests for the application
 */

import { Platform, Alert, Linking } from 'react-native';
import { PERMISSIONS, RESULTS, request, requestMultiple, check } from 'react-native-permissions';

export class PermissionService {
  static async requestAllPermissions(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        await this.requestAndroidPermissions();
      } else if (Platform.OS === 'ios') {
        await this.requestIOSPermissions();
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      throw error;
    }
  }

  private static async requestAndroidPermissions(): Promise<void> {
    const permissions = [
      PERMISSIONS.ANDROID.CAMERA,
      PERMISSIONS.ANDROID.RECORD_AUDIO,
      PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
      PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
      PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE,
      PERMISSIONS.ANDROID.BODY_SENSORS,
      PERMISSIONS.ANDROID.CALL_PHONE,
      PERMISSIONS.ANDROID.READ_PHONE_STATE,
    ];

    const results = await requestMultiple(permissions);
    
    // Check for any denied permissions
    const deniedPermissions = Object.keys(results).filter(
      (permission) => results[permission as keyof typeof results] === RESULTS.DENIED
    );

    if (deniedPermissions.length > 0) {
      this.showPermissionAlert();
    }
  }

  private static async requestIOSPermissions(): Promise<void> {
    const permissions = [
      PERMISSIONS.IOS.CAMERA,
      PERMISSIONS.IOS.MICROPHONE,
      PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
      PERMISSIONS.IOS.PHOTO_LIBRARY,
    ];

    const results = await requestMultiple(permissions);
    
    // Check for any denied permissions
    const deniedPermissions = Object.keys(results).filter(
      permission => results[permission as keyof typeof results] === RESULTS.DENIED
    );

    if (deniedPermissions.length > 0) {
      this.showPermissionAlert();
    }
  }

  static async checkCameraPermission(): Promise<boolean> {
    const permission = Platform.OS === 'android' 
      ? PERMISSIONS.ANDROID.CAMERA 
      : PERMISSIONS.IOS.CAMERA;
    
    const result = await check(permission);
    return result === RESULTS.GRANTED;
  }

  static async requestCameraPermission(): Promise<boolean> {
    const permission = Platform.OS === 'android' 
      ? PERMISSIONS.ANDROID.CAMERA 
      : PERMISSIONS.IOS.CAMERA;
    
    const result = await request(permission);
    return result === RESULTS.GRANTED;
  }

  static async checkMicrophonePermission(): Promise<boolean> {
    const permission = Platform.OS === 'android' 
      ? PERMISSIONS.ANDROID.RECORD_AUDIO 
      : PERMISSIONS.IOS.MICROPHONE;
    
    const result = await check(permission);
    return result === RESULTS.GRANTED;
  }

  static async requestMicrophonePermission(): Promise<boolean> {
    const permission = Platform.OS === 'android' 
      ? PERMISSIONS.ANDROID.RECORD_AUDIO 
      : PERMISSIONS.IOS.MICROPHONE;
    
    const result = await request(permission);
    return result === RESULTS.GRANTED;
  }

  static async checkLocationPermission(): Promise<boolean> {
    const permission = Platform.OS === 'android' 
      ? PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION 
      : PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;
    
    const result = await check(permission);
    return result === RESULTS.GRANTED;
  }

  static async requestLocationPermission(): Promise<boolean> {
    const permission = Platform.OS === 'android' 
      ? PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION 
      : PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;
    
    const result = await request(permission);
    return result === RESULTS.GRANTED;
  }

  private static showPermissionAlert(): void {
    Alert.alert(
      'Permissions Required',
      'Moodify Mirror requires camera, microphone, and other permissions to provide the best experience. Please grant these permissions in Settings.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: () => Linking.openSettings(),
        },
      ]
    );
  }
}
