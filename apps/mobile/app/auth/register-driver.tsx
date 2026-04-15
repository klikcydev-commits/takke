import React, { useState } from "react";
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { View } from "@/components/ui/view";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";
import { router } from "expo-router";
import { ChevronLeft, Truck, User, FileCheck, CheckCircle2, Upload } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from "@/utils/supabase";
import { api } from "@/utils/api";
import { ensureMarketplaceSession } from "@/utils/marketplaceAuth";

export default function DriverRegisterScreen() {
  const { colors, spacing } = useTheme();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    dateOfBirth: "",
    vehicleType: "CAR",
    vehicleModel: "",
    licensePlate: "",
    accountPassword: "",
  });

  const [docs, setDocs] = useState<{ [key: string]: string }>({});

  const handleNext = () => {
    if (step === 1 && (!form.fullName || !form.email)) {
      Alert.alert("Required", "Please provide your full legal name and email.");
      return;
    }
    if (step === 2 && (!form.vehicleModel || !form.licensePlate)) {
      Alert.alert("Required", "Please provide your vehicle details.");
      return;
    }
    if (step < 3) setStep(step + 1);
    else handleFinalSubmit();
  };

  const pickDocument = async (docType: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        uploadFile(result.assets[0], docType);
      }
    } catch (err) {
      console.error("Document picking error", err);
    }
  };

  const uploadFile = async (asset: any, docType: string) => {
    setUploading(docType);
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const fileName = `${Date.now()}-${asset.name}`;
      const filePath = `driver-docs/${fileName}`;

      const { data, error } = await supabase.storage
        .from('documents')
        .upload(filePath, blob);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(data.path);

      setDocs(prev => ({ ...prev, [docType]: publicUrl }));
      Alert.alert("Success", "Document uploaded successfully.");
    } catch (error: any) {
      Alert.alert("Upload Failed", error.message);
    } finally {
      setUploading(null);
    }
  };

  const handleFinalSubmit = async () => {
    if (!docs.identityCard || !docs.license) {
      Alert.alert("Missing Documents", "Please upload your Identity Card and Driving License.");
      return;
    }
    if (!form.accountPassword || form.accountPassword.length < 8) {
      Alert.alert("Marketplace login", "Enter your marketplace account password (min 8 characters).");
      return;
    }

    setLoading(true);
    try {
      await ensureMarketplaceSession(form.email.trim(), form.accountPassword);
      await api.post("applications/driver", {
        fullName: form.fullName.trim(),
        dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth).toISOString() : undefined,
        vehicleType: form.vehicleType,
        vehicleModel: form.vehicleModel.trim(),
        licensePlate: form.licensePlate.trim(),
        identityDocUrl: docs.identityCard,
        licenseDocUrl: docs.license,
        registrationDocUrl: docs.registration || undefined,
        insuranceDocUrl: docs.insurance || undefined,
      });
      setStep(4);
    } catch (error: unknown) {
      console.error("Submission error", error);
      const msg =
        error && typeof error === "object" && "message" in error
          ? String((error as { message: string }).message)
          : "Could not submit application.";
      Alert.alert("Submission Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.indicatorContainer} variant="none">
      {[1, 2, 3].map((s) => (
        <View 
          key={s} 
          style={[
            styles.indicator, 
            { 
              backgroundColor: s === step ? colors.primary : colors.border,
              width: s === step ? 30 : 8,
            }
          ]} 
          variant="none"
        />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header} variant="none">
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        {renderStepIndicator()}
        <View style={{ width: 40 }} variant="none" />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {step === 1 && (
          <View style={styles.content} variant="none">
            <View style={styles.iconCircle} variant="none">
              <User size={32} color={colors.primary} />
            </View>
            <Text style={styles.title} type="h2">Driver Profile</Text>
            <Text style={styles.subtitle} type="muted">Tell us who you are. This information must match your ID.</Text>
            
            <View style={styles.form} variant="none">
              <TextInput 
                placeholder="Full Legal Name"
                placeholderTextColor={colors.textSecondary}
                value={form.fullName}
                onChangeText={(text) => setForm({...form, fullName: text})}
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
              />
              <TextInput 
                placeholder="Email Address"
                placeholderTextColor={colors.textSecondary}
                value={form.email}
                onChangeText={(text) => setForm({...form, email: text})}
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                keyboardType="email-address"
              />
              <TextInput 
                placeholder="Date of Birth (YYYY-MM-DD)"
                placeholderTextColor={colors.textSecondary}
                value={form.dateOfBirth}
                onChangeText={(text) => setForm({...form, dateOfBirth: text})}
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
              />
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.content} variant="none">
            <View style={styles.iconCircle} variant="none">
              <Truck size={32} color={colors.primary} />
            </View>
            <Text style={styles.title} type="h2">Vehicle Details</Text>
            <Text style={styles.subtitle} type="muted">Register the vehicle you'll be using for deliveries.</Text>
            
            <View style={styles.form} variant="none">
              <TextInput 
                placeholder="Vehicle Model (e.g. Toyota Corolla)"
                placeholderTextColor={colors.textSecondary}
                value={form.vehicleModel}
                onChangeText={(text) => setForm({...form, vehicleModel: text})}
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
              />
              <TextInput 
                placeholder="License Plate"
                placeholderTextColor={colors.textSecondary}
                value={form.licensePlate}
                onChangeText={(text) => setForm({...form, licensePlate: text})}
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
              />
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.content} variant="none">
            <View style={styles.iconCircle} variant="none">
              <FileCheck size={32} color={colors.primary} />
            </View>
            <Text style={styles.title} type="h2">Verification</Text>
            <Text style={styles.subtitle} type="muted">
              Upload your driving license and national ID. Use your Supabase marketplace account password to submit.
            </Text>

            <TextInput
              placeholder="Marketplace account password (min 8 characters)"
              placeholderTextColor={colors.textSecondary}
              value={form.accountPassword}
              onChangeText={(text) => setForm({ ...form, accountPassword: text })}
              style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
              secureTextEntry
            />
            
            <View style={styles.uploadContainer} variant="none">
              <TouchableOpacity 
                onPress={() => pickDocument("identityCard")}
                disabled={uploading === "identityCard"}
                style={[styles.uploadCard, { borderColor: colors.border, borderStyle: 'dotted' }]}
              >
                {uploading === "identityCard" ? (
                  <ActivityIndicator color={colors.primary} />
                ) : docs.identityCard ? (
                  <CheckCircle2 size={32} color={colors.primary} />
                ) : (
                  <Upload size={24} color={colors.textSecondary} />
                )}
                <Text style={{ marginTop: 8 }} type="muted">{docs.identityCard ? "ID Uploaded" : "National Identity Card"}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => pickDocument("license")}
                disabled={uploading === "license"}
                style={[styles.uploadCard, { borderColor: colors.border, borderStyle: 'dotted' }]}
              >
                {uploading === "license" ? (
                  <ActivityIndicator color={colors.primary} />
                ) : docs.license ? (
                  <CheckCircle2 size={32} color={colors.primary} />
                ) : (
                  <Upload size={24} color={colors.textSecondary} />
                )}
                <Text style={{ marginTop: 8 }} type="muted">{docs.license ? "License Uploaded" : "Driving License (Front)"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 4 && (
          <View style={[styles.content, { alignItems: 'center', paddingTop: 40 }]} variant="none">
            <CheckCircle2 size={100} color={colors.primary} />
            <Text style={[styles.title, { marginTop: 32 }]} type="h2">Application Sent</Text>
            <Text style={[styles.subtitle, { textAlign: 'center' }]} type="muted">
              We've received your delivery application. Our vetting team will review your documents within 24-48 hours.
            </Text>
            <Button 
              label="Return to Dashboard"
              onPress={() => router.replace("/")}
              style={{ width: '100%', marginTop: 40 }}
            />
          </View>
        )}
      </ScrollView>

      {step < 4 && (
        <View style={[styles.footer, { borderTopColor: colors.border }]} variant="none">
          <Button 
            label={step === 3 ? "Submit Application" : "Continue"}
            onPress={handleNext}
            loading={loading}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 100,
  },
  content: {
    flex: 1,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  input: {
    height: 60,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: 'white',
  },
  uploadContainer: {
    gap: 16,
  },
  uploadCard: {
    height: 120,
    borderWidth: 2,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    borderTopWidth: 1,
    backgroundColor: 'white',
  },
});
