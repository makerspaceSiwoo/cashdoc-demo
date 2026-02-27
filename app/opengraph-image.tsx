import { ImageResponse } from "next/og";

export const alt = "캐시닥 데모 – 프로젝트 미리보기";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            marginBottom: 16,
            letterSpacing: "-0.02em",
          }}
        >
          캐시닥 데모
        </div>
        <div style={{ fontSize: 28, color: "#94a3b8" }}>
          프로젝트 미리보기 · 카드를 클릭해 이동하세요
        </div>
      </div>
    ),
    { ...size }
  );
}
