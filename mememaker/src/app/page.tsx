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
  '3:2': { w: 600, h: 900 },
  '16:9': { w: 1280, h: 720 },
}; // <-- NO 'as const' here

type AspectKey = keyof typeof ASPECTS;

const POSITIONS = [
  { value: 'above', label: 'Above Text' },
  { value: 'center', label: 'Center' },
  { value: 'below', label: 'Below Text' },
] as const;

type PositionValue = typeof POSITIONS[number]['value'];

function getFontSize(text: string, width: number, height: number): number {
  const len = text.length || 1;
  let size = Math.min(width, height) / Math.max(1.5, Math.sqrt(len / 2));
  return Math.max(28, Math.min(size, 120));
}

export default function Home(): JSX.Element {
  const [text, setText] = useState<string>('Your Meme Text');
  const [aspect, setAspect] = useState<AspectKey>('1:1');
  const [media, setMedia] = useState<MediaType | null>(null);
  const [mediaPos, setMediaPos] = useState<PositionValue>('center');
  const [watermarkText, setWatermarkText] = useState<string>('');
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 0
  );
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = (): void => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxWidth = windowWidth * 0.9;
  let w = ASPECTS[aspect].w;
  let h = ASPECTS[aspect].h;
  if (media) {
    const desiredWidth = Math.min(maxWidth, media.width);
    w = desiredWidth;
    h = desiredWidth / media.aspectRatio;
  } else {
    const aspectSize = ASPECTS[aspect];
    const scale = Math.min(maxWidth / aspectSize.w, 1);
    w = aspectSize.w * scale;
    h = aspectSize.h * scale;
  }

  const fontSize = getFontSize(text, w * 0.85, h * 0.45);

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
          setMedia({
            url,
            type: 'image',
            aspectRatio: img.naturalWidth / img.naturalHeight,
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
        };
        img.src = url;
      } else if (file.type.startsWith('video')) {
        const video = document.createElement('video');
        video.onloadedmetadata = () => {
          setMedia({
            url,
            type: 'video',
            aspectRatio: video.videoWidth / video.videoHeight,
            width: video.videoWidth,
            height: video.videoHeight,
          });
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
            value={text}
            maxLength={120}
            rows={2}
            placeholder="Enter meme text"
            onChange={e => setText(e.target.value)}
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
                disabled={!!media}
              >
                {Object.keys(ASPECTS).map(a => (
                  <option value={a} key={a}>{a}</option>
                ))}
              </select>
              {media && <span className="mememaker-lock">(Locked to media)</span>}
            </label>
            <label className="mememaker-label">
              Media Pos:
              <select className="mememaker-select" value={mediaPos}
                      onChange={e => setMediaPos(e.target.value as PositionValue)}>
                {POSITIONS.map(pos => (
                  <option value={pos.value} key={pos.value}>{pos.label}</option>
                ))}
              </select>
            </label>
            <button {...getRootProps()} className="mememaker-btn" type="button">
              <input {...getInputProps()} />
              {media ? 'Replace Media' : 'Add Image/Video'}
            </button>
          </div>
          <button onClick={downloadImg} className="mememaker-btn mememaker-btn-wide" type="button">Download Image</button>
        </div>

        {/* Preview area */}
        <div
          ref={previewRef}
          style={{ width: w, height: h, minHeight: 200, margin: '0 auto' }}
          className="mememaker-canvas"
        >
          {/* Media always fills the background */}
          {media && (
            <div style={{
              position: 'absolute', width: '100%', height: '100%',
              top: 0, left: 0, zIndex: 1
            }}>
              <MediaComponent media={media} />
            </div>
          )}
          {/* Content overlays */}
          <div className="mememaker-canvas-content">
            {media && mediaPos === 'above' && (
              <div style={{ paddingTop: '5%' }} />
            )}
            {(!media || mediaPos === 'center') && (
              <div className="mememaker-text-container">
                <div
                  className="mememaker-text"
                  style={{
                    fontSize,
                    background: 'linear-gradient(145deg,rgba(255,255,255,0.97) 55%,rgba(255,255,255,0.7) 75%,rgba(40,125,245,0.13) 100%)',
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent"
                  }}
                >{text}</div>
              </div>
            )}
            {media && mediaPos === 'below' && (
              <div style={{ paddingBottom: '10%' }} />
            )}
            <div className="mememaker-watermark" style={{ fontSize: Math.max(10, h * 0.04) }}>
              {watermarkText}
            </div>
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
