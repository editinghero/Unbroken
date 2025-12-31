import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import HapticManager from '@/services/HapticManager';
import { ForgotPasswordModal } from './ForgotPasswordModal';

interface AuthFormProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  onResetPassword: (email: string) => Promise<void>;
  onSendEmailVerification?: () => Promise<void>;
  onSkip: () => void;
  isLoading: boolean;
  showEmailVerificationPrompt?: boolean;
}

export function AuthForm({ 
  onSignIn, 
  onSignUp, 
  onResetPassword, 
  onSendEmailVerification,
  onSkip, 
  isLoading,
  showEmailVerificationPrompt = false
}: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const hapticManager = HapticManager.getInstance();

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (isSignUp && password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    hapticManager.triggerButton();

    try {
      if (isSignUp) {
        await onSignUp(email.trim(), password);
        // Show email verification prompt after successful signup
        Alert.alert(
          'Account Created!',
          'A verification email has been sent to your email address. Please check your inbox and verify your email to secure your account.',
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        await onSignIn(email.trim(), password);
      }
      hapticManager.triggerSuccess();
    } catch (error: any) {
      hapticManager.triggerError();
      Alert.alert('Error', error.message);
    }
  };

  const handleSendEmailVerification = async () => {
    if (!onSendEmailVerification) return;
    
    hapticManager.triggerButton();
    
    try {
      await onSendEmailVerification();
      hapticManager.triggerSuccess();
      Alert.alert(
        'Verification Email Sent',
        'A new verification email has been sent to your email address. Please check your inbox.',
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error: any) {
      hapticManager.triggerError();
      Alert.alert('Error', error.message);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    hapticManager.triggerButton();

    try {
      await onResetPassword(email.trim());
      hapticManager.triggerSuccess();
      Alert.alert('Success', 'Password reset email sent! Check your inbox.');
    } catch (error: any) {
      hapticManager.triggerError();
      Alert.alert('Error', error.message);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <Text style={styles.title}>
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </Text>
          <Text style={styles.subtitle}>
            {isSignUp 
              ? 'Sign up to sync your fitness data' 
              : 'Sign in to access your fitness data'
            }
          </Text>

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Mail size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Lock size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                {showPassword ? (
                  <EyeOff size={20} color={colors.textSecondary} />
                ) : (
                  <Eye size={20} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>

            {isSignUp && (
              <View style={styles.inputWrapper}>
                <Lock size={20} color={colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor={colors.textTertiary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeButton}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color={colors.textSecondary} />
                  ) : (
                    <Eye size={20} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            </Text>
          </TouchableOpacity>

          {!isSignUp && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => setShowForgotPasswordModal(true)}
              disabled={isLoading}
            >
              <Text style={styles.resetButtonText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          {showEmailVerificationPrompt && onSendEmailVerification && (
            <View style={styles.verificationPrompt}>
              <Text style={styles.verificationTitle}>Email Verification Required</Text>
              <Text style={styles.verificationText}>
                Please verify your email address to secure your account and enable all features.
              </Text>
              <TouchableOpacity
                style={styles.verificationButton}
                onPress={handleSendEmailVerification}
                disabled={isLoading}
              >
                <Text style={styles.verificationButtonText}>Resend Verification Email</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
            disabled={isLoading}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>

          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <TouchableOpacity onPress={toggleMode} disabled={isLoading}>
              <Text style={styles.switchButtonText}>
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <ForgotPasswordModal
        visible={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
        onResetPassword={onResetPassword}
        isLoading={isLoading}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    gap: 16,
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  eyeButton: {
    padding: 4,
  },
  submitButton: {
    backgroundColor: colors.gold,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
  resetButton: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resetButtonText: {
    fontSize: 14,
    color: colors.gold,
    textDecorationLine: 'underline',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  switchText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  switchButtonText: {
    fontSize: 14,
    color: colors.gold,
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  verificationPrompt: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  verificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gold,
    textAlign: 'center',
    marginBottom: 8,
  },
  verificationText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  verificationButton: {
    backgroundColor: 'rgba(203, 169, 129, 0.1)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  verificationButtonText: {
    fontSize: 14,
    color: colors.gold,
    fontWeight: '600',
  },
});