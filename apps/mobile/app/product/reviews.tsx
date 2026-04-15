import { IconSymbol } from "@/components/ui/icon-symbol";
import { RatingIndicator } from "@/components/ui/rating-indicator"; // Import here
import { REVIEWS_DATA } from "@/constants/mock-data";
import { useTheme } from "@/hooks/use-theme";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
   Image,
   ScrollView,
   StyleSheet,
   Text,
   TouchableOpacity,
   View,
} from "react-native";

const RatingProgressIndicator = ({
  score,
  percentage,
}: {
  score: string;
  percentage: number;
}) => {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.progressRow}>
      <Text
        style={[{ flex: 1, color: colors.textSecondary }, typography.bodyBold]}
      >
        {score}
      </Text>
      <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${percentage * 100}%`, backgroundColor: colors.primary },
          ]}
        />
      </View>
    </View>
  );
};

export default function ProductReviewsScreen() {
  const router = useRouter();
  const { colors, typography } = useTheme();

  const [expandedReviews, setExpandedReviews] = useState<
    Record<string, boolean>
  >({});

  const toggleReview = (id: string) => {
    setExpandedReviews((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: colors.border, backgroundColor: colors.surface },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol
            name="chevron.left"
            size={24}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={[typography.h2, { color: colors.textPrimary }]}>
          Reviews & Ratings
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text
          style={[
            typography.body,
            { color: colors.textSecondary, marginBottom: 24 },
          ]}
        >
          Ratings and reviews are verified and are from people who use the same
          type of device that you use.
        </Text>

        {/* Overall Ratings */}
        <View style={styles.overallRatingContainer}>
          <Text
            style={[
              {
                fontSize: 50,
                fontWeight: "bold",
                flex: 3,
                color: colors.textPrimary,
              },
            ]}
          >
            {REVIEWS_DATA.overallRating}
          </Text>
          <View style={styles.progressIndicatorsContainer}>
            {REVIEWS_DATA.ratingDistribution.map((dist) => (
              <RatingProgressIndicator
                key={dist.score}
                score={dist.score}
                percentage={dist.percentage}
              />
            ))}
          </View>
        </View>

        {/* Stars overview */}
        <View style={styles.ratingStarsReviewCount}>
          {/* Using the new component for 4.5 stars */}
          <RatingIndicator rating={REVIEWS_DATA.overallRating} size={20} />
          <Text
            style={[
              typography.small,
              { color: colors.textSecondary, marginTop: 4 },
            ]}
          >
            {REVIEWS_DATA.totalReviews.toLocaleString()} Ratings
          </Text>
        </View>

        {/* Review List */}
        {REVIEWS_DATA.reviews.map((item) => {
          const isExpanded = expandedReviews[item.id];
          return (
            <View key={item.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.userInfo}>
                  <Image
                    source={{ uri: item.user.avatar }}
                    style={[styles.avatar, { backgroundColor: colors.border }]}
                  />
                  <Text style={[typography.h3, { color: colors.textPrimary }]}>
                    {item.user.name}
                  </Text>
                </View>
                <TouchableOpacity>
                  <IconSymbol
                    name="ellipsis"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.reviewMeta}>
                {/* Using the new component for a user's rating */}
                <RatingIndicator
                  rating={item.rating}
                  size={14}
                  style={{ marginRight: 10 }}
                />
                <Text
                  style={[typography.small, { color: colors.textSecondary }]}
                >
                  {item.date}
                </Text>
              </View>

              <Text
                style={[
                  typography.body,
                  {
                    color: colors.textSecondary,
                    marginBottom: isExpanded ? 16 : 0,
                  },
                ]}
                numberOfLines={isExpanded ? undefined : 3}
              >
                {item.content}
                {isExpanded && (
                  <>
                    {"  "}
                    <Text
                      onPress={() => toggleReview(item.id)}
                      style={[typography.bodyBold, { color: colors.primary }]}
                    >
                      show less
                    </Text>
                  </>
                )}
              </Text>
              {!isExpanded && (
                <TouchableOpacity
                  onPress={() => toggleReview(item.id)}
                  activeOpacity={0.7}
                  style={{ marginTop: 2, marginBottom: 16 }}
                >
                  <Text
                    style={[typography.bodyBold, { color: colors.primary }]}
                  >
                    show more
                  </Text>
                </TouchableOpacity>
              )}

              {/* Store Reply */}
              {item.storeReply ? (
                <View
                  style={[
                    styles.storeReplyBox,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <View style={styles.replyHeader}>
                    <Text
                      style={[
                        typography.bodyBold,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {item.storeReply.storeName}
                    </Text>
                    <Text
                      style={[
                        typography.small,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {item.storeReply.date}
                    </Text>
                  </View>
                  <Text
                    style={[typography.body, { color: colors.textSecondary }]}
                  >
                    {item.storeReply.content}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },

  content: { padding: 16, paddingBottom: 40 },

  // Overall Rating
  overallRatingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  progressIndicatorsContainer: { flex: 7 },
  progressRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  progressBarBg: { flex: 11, height: 10, borderRadius: 5, overflow: "hidden" },
  progressBarFill: { height: "100%" },

  ratingStarsReviewCount: { marginBottom: 32 },
  // starsRow removed as it's now handled by RatingIndicator

  // Review Card
  reviewCard: { marginBottom: 32 },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  userInfo: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },

  reviewMeta: { flexDirection: "row", alignItems: "center", marginBottom: 12 },

  storeReplyBox: { padding: 16, borderRadius: 12 },
  replyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
});
