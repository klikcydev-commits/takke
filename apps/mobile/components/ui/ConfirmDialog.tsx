import { Modal, Pressable, StyleSheet, View as RNView } from "react-native";
import { Button } from "./button";
import { Card } from "./card";
import { Text } from "./text";
import { View } from "./view";

export default function ConfirmDialog({
  visible,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onCancel,
  onConfirm,
  destructive = false,
}: {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <RNView style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <Card style={styles.card}>
          <View style={styles.content}>
            <Text type="subtitle" style={styles.title}>
              {title}
            </Text>
            {description ? (
              <Text type="muted" style={styles.description}>{description}</Text>
            ) : null}

            <View style={styles.actions}>
              <Button
                variant="ghost"
                onPress={onCancel}
                label={cancelLabel}
                style={styles.button}
              />
              <Button
                variant={destructive ? "destructive" : "primary"}
                onPress={onConfirm}
                label={confirmLabel}
                style={styles.button}
              />
            </View>
          </View>
        </Card>
      </RNView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    borderRadius: 24,
    borderWidth: 0,
  },
  content: {
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 20,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 12,
  },
  button: {
    minWidth: 90,
  },
});
