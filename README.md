# Unbroken Fitness

A minimalist fitness tracking app designed to help you maintain consistency in your gym routine. Track your daily check-ins, build streaks, and stay motivated with clean, intuitive design.

**Download**: [Latest Release](https://github.com/editinghero/unbroken/releases)

**Preview**: [Website](https://unbroken.expo.app/)

## Features

- **Daily Check-ins**: Simple one-tap gym visit logging
- **Streak Tracking**: Monitor current and best streaks
- **Statistics**: Comprehensive weekly and monthly performance metrics
- **Holiday Management**: Exclude holidays from streak calculations
- **Firebase Sync**: Secure cloud backup and sync across devices
- **Email Authentication**: Simple email/password sign up and sign in
- **Offline Support**: Works offline with automatic sync when online
- **Dark Theme**: Beautiful dark interface with gold accents
- **Haptic Feedback**: Enhanced user experience with tactile responses

## Built With

- **React Native** - Cross-platform mobile development
- **Expo** - Development platform and build tools
- **TypeScript** - Type-safe JavaScript
- **React Query** - Data fetching and state management
- **Expo Router** - File-based navigation
- **Firebase** - Authentication and real-time database
- **AsyncStorage** - Local data persistence and offline support

## Screenshots
<table>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/95f1ab83-6804-46be-9f61-6e46a6a23ce6" alt="home" width="250"/></td>
    <td><img src="https://github.com/user-attachments/assets/2d703066-7b15-455a-b271-7d1ad79933ac" alt="calendar" width="250"/></td>
    <td><img src="https://github.com/user-attachments/assets/8cb7fbff-c66d-44d4-8281-ad6e872fc3da" alt="stats" width="250"/></td>
  </tr>
</table>


## Installation

### From Releases
1. Go to [Releases](https://github.com/editinghero/unbroken/releases)
2. Download the latest APK file
3. Install on your Android device

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/editinghero/unbroken.git
   cd unbroken-fitness
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase** (Required for authentication and sync)
   - Create a Firebase project with Authentication and Firestore
   - Create a `.env` file in the root directory based on `.env.example` and fill in your Firebase configuration

4. **Start the development server**
   ```bash
   npm start
   ```

## Building

### Android
```bash
npm run build:android
```

### Production Build
```bash
npm run build:production
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Privacy

- All data is stored locally on your device with offline support
- Firebase sync is optional and requires user authentication
- Data is securely stored in your personal Firebase project
- No analytics or tracking is implemented
- No personal data is collected by the app developers
- Users have full control over their data and can delete their account anytime

## Support

If you encounter any issues or have suggestions, please [open an issue](https://github.com/editinghero/unbroken/issues).
