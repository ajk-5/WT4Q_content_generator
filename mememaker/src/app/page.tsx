'use client';
import React, { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { useDropzone } from 'react-dropzone';

type MediaType = {
  url: string;
  type: 'image' | 'video';
  aspectRatio: number;
  width: number;
  height: number;
};

const ASPECTS = {
  '1:1': { w: 900, h: 900 },
  '3:2': { w: 900, h: 600 },
  '2:3': { w: 600, h: 900 },
  '4:3': { w: 1200, h: 900 },
  '3:4': { w: 900, h: 1200 },
  '16:9': { w: 1280, h: 720 },
  '9:16': { w: 720, h: 1280 },
}; // <-- NO 'as const' here

type AspectKey = keyof typeof ASPECTS;

function getFontSize(text: string, width: number, height: number): number {
  const len = text.length || 1;
  let size = Math.min(width, height) / Math.max(1.5, Math.sqrt(len / 2));
  return Math.max(28, Math.min(size, 120));
}

function findClosestAspect(ratio: number): AspectKey {
  let closest: AspectKey = '1:1';
  let minDiff = Infinity;
  (Object.keys(ASPECTS) as AspectKey[]).forEach(key => {
    const diff = Math.abs(ratio - ASPECTS[key].w / ASPECTS[key].h);
    if (diff < minDiff) {
      minDiff = diff;
      closest = key;
    }
  });
  return closest;
}

export default function Home(): JSX.Element {
  const [mainText, setMainText] = useState<string>('Your Text');
  const [aspect, setAspect] = useState<AspectKey>('1:1');
  const [media, setMedia] = useState<MediaType | null>(null);
  const [watermarkText, setWatermarkText] = useState<string>('');
  const [mediaPlacement, setMediaPlacement] = useState<'center' | 'above' | 'below'>('center');
  const [fontFamily, setFontFamily] = useState<string>('Impact, Arial, sans-serif');
  const [customFontSize, setCustomFontSize] = useState<number | null>(null);
  // Start with a fixed value so server and client markup match during hydration
  const [windowWidth, setWindowWidth] = useState<number>(0);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = (): void => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxWidth = windowWidth * 0.9;
  const aspectSize = ASPECTS[aspect];
  const widthScale = Math.min(maxWidth / aspectSize.w, 1);
  const mediaScale = media ? Math.min(media.width / aspectSize.w, media.height / aspectSize.h) : 1;
  const scale = Math.min(widthScale, mediaScale);
  const w = aspectSize.w * scale;
  const h = aspectSize.h * scale;

  const autoFontSize = getFontSize(mainText, w * 0.85, media ? h * 0.4 : h * 0.8);
  const fontSize = customFontSize ?? autoFontSize;
  const mediaStyle = mediaPlacement === 'below' ? { justifyContent: 'flex-end' } : {};

  useEffect(() => {
    setCustomFontSize(null);
  }, [mainText, aspect, media, windowWidth]);

  // Revoke object URLs when media changes to avoid memory leaks
  useEffect(() => {
    return () => {
      if (media?.url) {
        URL.revokeObjectURL(media.url);
      }
    };
  }, [media]);

  // Dropzone with image/video aspect detection
  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'image/*': [], 'video/*': [] },
    maxFiles: 1,
    onDrop: (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      const url = URL.createObjectURL(file);

      if (file.type.startsWith('image')) {
        const img = new window.Image();
        img.onload = () => {
          const ratio = img.naturalWidth / img.naturalHeight;
          setMedia({
            url,
            type: 'image',
            aspectRatio: ratio,
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
          setAspect(findClosestAspect(ratio));
        };
        img.src = url;
      } else if (file.type.startsWith('video')) {
        const video = document.createElement('video');
        video.onloadedmetadata = () => {
          const ratio = video.videoWidth / video.videoHeight;
          setMedia({
            url,
            type: 'video',
            aspectRatio: ratio,
            width: video.videoWidth,
            height: video.videoHeight,
          });
          setAspect(findClosestAspect(ratio));
        };
        video.src = url;
      }
    }
  });

  const downloadImg = async (): Promise<void> => {
    if (!previewRef.current) return;
    const canvas = await html2canvas(previewRef.current, { backgroundColor: null, useCORS: true });
    const data = canvas.toDataURL();
    const link = document.createElement('a');
    link.href = data;
    link.download = 'meme.png';
    link.click();
  };

  return (
    <div className="mememaker-bg">
      <div className="mememaker-main">
        <div className="mememaker-form">
          <textarea
            className="mememaker-input"
            value={mainText}
            maxLength={240}
            rows={3}
            placeholder="Enter text"
            onChange={e => setMainText(e.target.value)}
          />
          <input
            className="mememaker-input"
            type="text"
            value={watermarkText}
            maxLength={64}
            placeholder="Enter custom watermark (optional)"
            onChange={e => setWatermarkText(e.target.value)}
          />
          <div className="mememaker-row">
            <label className="mememaker-label">
              Aspect Ratio:
              <select
                className="mememaker-select"
                value={aspect}
                onChange={e => setAspect(e.target.value as AspectKey)}
              >
                {Object.keys(ASPECTS).map(a => (
                  <option value={a} key={a}>{a}</option>
                ))}
              </select>
            </label>
            <label className="mememaker-label">
              Media Position:
              <select
                className="mememaker-select"
                value={mediaPlacement}
                onChange={e => setMediaPlacement(e.target.value as 'center' | 'above' | 'below')}
              >
                <option value="center">Center</option>
                <option value="above">Above Text</option>
                <option value="below">Below Text</option>
              </select>
            </label>
            <button {...getRootProps()} className="mememaker-btn" type="button">
              <input {...getInputProps()} />
              {media ? 'Replace Media' : 'Add Image/Video'}
            </button>
          </div>
          <div className="mememaker-row">
            <label className="mememaker-label">
              Font:
              <select
                className="mememaker-select"
                value={fontFamily}
                onChange={e => setFontFamily(e.target.value)}
              >
                <option value="Impact, Arial, sans-serif">Impact</option>
                <option value="Arial, sans-serif">Arial</option>
                <option value="'Comic Sans MS', cursive, sans-serif">Comic Sans</option>
                <option value="'Courier New', monospace">Courier New</option>
                <option value="'Times New Roman', serif">Times New Roman</option>
              </select>
            </label>
            <label className="mememaker-label">
              Font Size:
              <input
                className="mememaker-slider"
                type="range"
                min={20}
                max={200}
                value={fontSize}
                onChange={e => setCustomFontSize(Number(e.target.value))}
              />
              <span className="mememaker-lock">{Math.round(fontSize)}px</span>
            </label>
          </div>
          <button onClick={downloadImg} className="mememaker-btn mememaker-btn-wide" type="button">Download Image</button>
        </div>

        {/* Preview area */}
        <div
          ref={previewRef}
          style={{ width: w, height: h, minHeight: 200, margin: '0 auto' }}
          className="mememaker-canvas"
        >
          <div className="mememaker-canvas-content">
            {media && mediaPlacement === 'above' && (
              <div className="mememaker-media-wrapper" style={mediaStyle}>
                <MediaComponent media={media} />
              </div>
            )}
            <div className="mememaker-text-container">
              <div className="mememaker-text" style={{ fontSize, fontFamily }}>
                {mainText}
              </div>
            </div>
            {media && mediaPlacement !== 'above' && (
              <div className="mememaker-media-wrapper" style={mediaStyle}>
                <MediaComponent media={media} />
              </div>
            )}
            {watermarkText && (
              <div className="mememaker-watermark" style={{ fontSize: Math.max(10, h * 0.04) }}>
                {watermarkText}
              </div>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'center', color: '#bbb', fontSize: 12, marginTop: 20 }}>
          Powered by Next.js, pure CSS, and html2canvas. No data is uploaded.
        </div>
      </div>
    </div>
  );
}

function MediaComponent({ media }: { media: MediaType }): JSX.Element {
  return (
    <>
      {media.type === 'image' ? (
        <img
          src={media.url}
          alt="uploaded"
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            borderRadius: 20,
            background: '#222'
          }}
        />
      ) : (
        <video
          src={media.url}
          controls
          draggable={false}
          loop
          autoPlay
          muted
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            borderRadius: 20,
            background: '#222'
          }}
        />
      )}
    </>
  );
}
