import React, { useCallback, useEffect, useState } from "react";
import { Image, Modal, Pressable, Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { Btn, Card, Empty, ErrorText, Field, Loading, Muted, Screen, errMsg, notify, useAction } from "../src/components/ui";
import { fetchGallery, moderateGallery, uploadGalleryPhoto, type GalleryItem } from "../src/api/client";
import { absoluteUrl } from "../src/api/absoluteUrl";
import { useLive } from "../src/context/LiveContext";
import { colors } from "../src/theme";

const FULL_EDGE = 1600;
const THUMB_EDGE = 480;

async function shrink(uri: string, w: number, h: number, edge: number, quality: number) {
  const long = Math.max(w, h);
  const scale = long > edge ? edge / long : 1;
  const actions = scale < 1 ? [{ resize: w >= h ? { width: Math.round(w * scale) } : { height: Math.round(h * scale) } }] : [];
  return manipulateAsync(uri, actions, { compress: quality, format: SaveFormat.JPEG });
}

export default function Gallery() {
  const { matchId } = useLocalSearchParams<{ matchId?: string }>();
  const { season } = useLive();
  const { width } = useWindowDimensions();
  const [photos, setPhotos] = useState<GalleryItem[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [open, setOpen] = useState<GalleryItem | null>(null);
  const { busy, error, run } = useAction();

  const load = useCallback(async () => {
    try {
      const r = await fetchGallery(season, matchId || null);
      setPhotos(r.photos);
      setLoadErr(null);
    } catch (e) {
      setLoadErr(errMsg(e));
    }
  }, [season, matchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async (source: "library" | "camera") => {
    const perm =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      notify("Permission needed", "Allow access in Settings to add photos.");
      return;
    }
    const res =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    await run(async () => {
      const full = await shrink(asset.uri, asset.width, asset.height, FULL_EDGE, 0.7);
      const thumb = await shrink(asset.uri, asset.width, asset.height, THUMB_EDGE, 0.6);
      const r = await uploadGalleryPhoto({
        uri: full.uri,
        width: full.width,
        height: full.height,
        thumbUri: thumb.uri,
        season,
        matchId: matchId || null,
        caption: caption.trim(),
      });
      setCaption("");
      notify(r.message || "Uploaded");
      await load();
    });
  };

  const size = (width - 32 - 8) / 2;

  return (
    <Screen onRefresh={load}>
      <Card>
        <Muted>
          {matchId ? `Photos for match ${matchId}. ` : ""}Add a photo. Photos from the public are reviewed by organisers before they appear.
        </Muted>
        <Field label="Caption (optional)" value={caption} onChangeText={setCaption} autoCapitalize="sentences" />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Btn title="Choose photo" onPress={() => upload("library")} loading={busy} style={{ flex: 1 }} />
          <Btn title="Camera" variant="secondary" onPress={() => upload("camera")} disabled={busy} style={{ flex: 1 }} />
        </View>
        <ErrorText>{error}</ErrorText>
      </Card>

      <ErrorText>{loadErr}</ErrorText>
      {!photos && !loadErr && <Loading />}
      {photos && photos.length === 0 && <Empty>No photos yet. Be the first to add one.</Empty>}
      {photos && photos.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {photos.map((p) => (
            <Pressable key={p.id} onPress={() => setOpen(p)}>
              <Image
                source={{ uri: absoluteUrl(p.thumbUrl || p.blobUrl) }}
                style={{ width: size, height: size, borderRadius: 10, backgroundColor: colors.cardAlt }}
                resizeMode="cover"
              />
            </Pressable>
          ))}
        </View>
      )}

      <Modal visible={!!open} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <Pressable
          onPress={() => setOpen(null)}
          style={{ flex: 1, backgroundColor: "#000000EE", justifyContent: "center", padding: 12 }}
        >
          {open && (
            <>
              <Image
                source={{ uri: absoluteUrl(open.blobUrl) }}
                style={{ width: "100%", aspectRatio: open.width && open.height ? open.width / open.height : 1 }}
                resizeMode="contain"
              />
              {open.caption ? (
                <Text style={{ color: colors.text, textAlign: "center", marginTop: 12 }}>{open.caption}</Text>
              ) : null}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 16, justifyContent: "center" }}>
                {open.status === "pending" && (
                  <Btn
                    title="Approve"
                    onPress={() =>
                      run(async () => {
                        await moderateGallery({ action: "approve", id: open.id, season });
                        setOpen(null);
                        await load();
                      })
                    }
                  />
                )}
                <Btn
                  title="Delete"
                  variant="secondary"
                  onPress={() =>
                    run(async () => {
                      await moderateGallery({ action: "delete", id: open.id, season });
                      setOpen(null);
                      await load();
                    })
                  }
                />
              </View>
            </>
          )}
        </Pressable>
      </Modal>
    </Screen>
  );
}
