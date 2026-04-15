import React, { useState } from "react";
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { View } from "@/components/ui/view";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";
import { router } from "expo-router";
import { ChevronLeft, Store, MapPin, FileText, CheckCircle2, Upload, File } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from "@/utils/supabase";
import { api } from "@/utils/api";
import { ensureMarketplaceSession } from "@/utils/marketplaceAuth";

interface FormData {
  name: string;
  email: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  type: string;
  accountPassword: string;
}

export default function StoreRegisterScreen() {
  const { colors, spacing } = useTheme();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    description: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
    phone: "",
    type: "Retail",
    accountPassword: "",
  });

  const [docs, setDocs] = useState<{ name: string; url: string; type: string }[]>([]);

  const handleNext = () => {
    if (step === 1 && (!formData.name || !formData.email)) {
      Alert.alert("Required", "Please provide a business name and email.");
      return;
    }
    if (step === 2 && (!formData.address || !formData.city || !formData.state)) {
      Alert.alert("Required", "Please provide your business address, city, and state/region.");
      return;
    }
    
    if (step < 3) setStep(step + 1);
    else handleFinalSubmit();
  };

  const pickDocument = async (type: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        uploadFile(result.assets[0], type);
      }
    } catch (err) {
      console.error("Document picking error", err);
    }
  };

  const uploadFile = async (asset: any, docLabel: string) => {
    setUploading(docLabel);
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const fileName = `${Date.now()}-${asset.name}`;
      const filePath = `store-docs/${fileName}`;

      const { data, error } = await supabase.storage
        .from('documents')
        .upload(filePath, blob);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(data.path);

      setDocs(prev => [
        ...prev.filter(d => d.name !== docLabel),
        { name: docLabel, url: publicUrl, type: asset.name.split('.').pop()?.toUpperCase() || 'FILE' }
      ]);
      
      Alert.alert("Success", `${docLabel} uploaded successfully.`);
    } catch (error: any) {
      Alert.alert("Upload Failed", error.message);
    } finally {
      setUploading(null);
    }
  };

  const handleFinalSubmit = async () => {
    if (docs.length < 1) {
      Alert.alert("Missing Documents", "Please upload at least one business document for verification.");
      return;
    }
    if (!formData.accountPassword || formData.accountPassword.length < 8) {
      Alert.alert(
        "Marketplace login",
        "Enter the password for your Supabase account (new accounts are created on submit if the email is new).",
      );
      return;
    }

    setLoading(true);
    try {
      await ensureMarketplaceSession(formData.email.trim(), formData.accountPassword);
      await api.post("applications/store", {
        businessName: formData.name.trim(),
        businessType: (formData.type || "RETAIL").toUpperCase().replace(/\s+/g, "_"),
        description: formData.description.trim(),
        contactEmail: formData.email.trim(),
        contactPhone: formData.phone.trim(),
        businessAddress: [formData.address, formData.city, formData.state, formData.zip, formData.country]
          .filter(Boolean)
          .join(", "),
        city: formData.city.trim(),
        state: formData.state.trim(),
        country: formData.country.trim() || "US",
        documents: docs,
      });
      setStep(4);
    } catch (error: unknown) {
      console.error("Submission error", error);
      const msg =
        error && typeof error === "object" && "message" in error
          ? String((error as { message: string }).message)
          : "Could not submit application. Check EXPO_PUBLIC_VENDOR_API_URL (vendor-web /api), Supabase env, and try again.";
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
              <Store size={32} color={colors.primary} />
            </View>
            <Text style={styles.title} type="h2">Business Info</Text>
            <Text style={styles.subtitle} type="muted">Tell us about your brand. This will be visible to all customers.</Text>
            
            <View style={styles.form} variant="none">
              <TextInput 
                placeholder="Business Name (e.g. Luxury Boutique)"
                placeholderTextColor={colors.textSecondary}
                value={formData.name}
                onChangeText={(text) => setFormData({...formData, name: text})}
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
              />
              <TextInput 
                placeholder="Business Email"
                placeholderTextColor={colors.textSecondary}
                value={formData.email}
                onChangeText={(text) => setFormData({...formData, email: text})}
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                keyboardType="email-address"
              />
              <TextInput 
                placeholder="Description"
                placeholderTextColor={colors.textSecondary}
                value={formData.description}
                onChangeText={(text) => setFormData({...formData, description: text})}
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, height: 100 }]}
                multiline
              />
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.content} variant="none">
            <View style={styles.iconCircle} variant="none">
              <MapPin size={32} color={colors.primary} />
            </View>
            <Text style={styles.title} type="h2">Location</Text>
            <Text style={styles.subtitle} type="muted">Where is your primary fulfillment center or store located?</Text>
            
            <View style={styles.form} variant="none">
              <TextInput 
                placeholder="Street Address"
                placeholderTextColor={colors.textSecondary}
                value={formData.address}
                onChangeText={(text) => setFormData({...formData, address: text})}
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
              />
              <View style={{ flexDirection: 'row', gap: 12 }} variant="none">
                <TextInput 
                  placeholder="City"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.city}
                  onChangeText={(text) => setFormData({...formData, city: text})}
                  style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, flex: 1 }]}
                />
                <TextInput 
                  placeholder="Zip"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.zip}
                  onChangeText={(text) => setFormData({...formData, zip: text})}
                  style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, width: 100 }]}
                />
              </View>
              <TextInput 
                placeholder="State / Region"
                placeholderTextColor={colors.textSecondary}
                value={formData.state}
                onChangeText={(text) => setFormData({...formData, state: text})}
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
              />
              <TextInput 
                placeholder="Country code (e.g. US)"
                placeholderTextColor={colors.textSecondary}
                value={formData.country}
                onChangeText={(text) => setFormData({...formData, country: text})}
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                autoCapitalize="characters"
              />
              <TextInput 
                placeholder="Phone Number"
                placeholderTextColor={colors.textSecondary}
                value={formData.phone}
                onChangeText={(text) => setFormData({...formData, phone: text})}
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.content} variant="none">
            <View style={styles.iconCircle} variant="none">
              <FileText size={32} color={colors.primary} />
            </View>
            <Text style={styles.title} type="h2">Documentation</Text>
            <Text style={styles.subtitle} type="muted">
              Upload your business license and tax certificates. Use the same email and password as your Supabase marketplace account — register in the app first if needed.
            </Text>

            <TextInput
              placeholder="Marketplace account password (min 8 characters)"
              placeholderTextColor={colors.textSecondary}
              value={formData.accountPassword}
              onChangeText={(text) => setFormData({ ...formData, accountPassword: text })}
              style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
              secureTextEntry
            />
            
            <View style={styles.uploadContainer} variant="none">
              <TouchableOpacity 
                onPress={() => pickDocument("Business License")}
                disabled={uploading === "Business License"}
                style={[styles.uploadCard, { borderColor: colors.border, borderStyle: 'dotted' }]}
              >
                {uploading === "Business License" ? (
                  <ActivityIndicator color={colors.primary} />
                ) : docs.find(d => d.name === "Business License") ? (
                  <CheckCircle2 size={32} color={colors.primary} />
                ) : (
                  <Upload size={24} color={colors.textSecondary} />
                )}
                <Text style={{ marginTop: 8 }} type="muted">
                  {docs.find(d => d.name === "Business License") ? "License Uploaded" : "Business license (PDF/JPG)"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => pickDocument("Tax ID Certificate")}
                disabled={uploading === "Tax ID Certificate"}
                style={[styles.uploadCard, { borderColor: colors.border, borderStyle: 'dotted' }]}
              >
                {uploading === "Tax ID Certificate" ? (
                  <ActivityIndicator color={colors.primary} />
                ) : docs.find(d => d.name === "Tax ID Certificate") ? (
                  <CheckCircle2 size={32} color={colors.primary} />
                ) : (
                  <Upload size={24} color={colors.textSecondary} />
                )}
                <Text style={{ marginTop: 8 }} type="muted">
                  {docs.find(d => d.name === "Tax ID Certificate") ? "Tax ID Uploaded" : "Tax Identification Doc"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 4 && (
          <View style={[styles.content, { alignItems: 'center', paddingTop: 40 }]} variant="none">
            <CheckCircle2 size={100} color={colors.primary} />
            <Text style={[styles.title, { marginTop: 32 }]} type="h2">Application Sent</Text>
            <Text style={[styles.subtitle, { textAlign: 'center' }]} type="muted">
              We've received your store application for <Text style={{ fontWeight: 'bold' }}>{formData.name}</Text>. Our vetting team will review your documents within 24-48 hours.
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
            label={step === 3 ? "Submit Store Application" : "Next Step"}
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
