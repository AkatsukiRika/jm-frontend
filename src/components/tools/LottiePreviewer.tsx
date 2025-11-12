'use client';

import { useState, useEffect, useRef } from 'react';
import lottie, { AnimationItem } from 'lottie-web';
import { useThemeColors } from '@/lib/hooks/useThemeColors';
import { useTranslation } from '@/components/I18nProvider';

export default function LottiePreviewer() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AnimationItem | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [imageAssets, setImageAssets] = useState<{ [key: string]: string }>({});
  const [showToast, setShowToast] = useState(false);

  // 清理动画
  const clearAnimation = () => {
    if (animationRef.current) {
      animationRef.current.destroy();
      animationRef.current = null;
    }
    setIsPlaying(false);
    setCurrentFrame(0);
    setTotalFrames(0);
  };

  // 加载 JSON
  const loadJSON = async (file: File) => {
    try {
      const text = await file.text();
      const animationData = JSON.parse(text);

      // 如果有图片资源，替换为已加载的图片
      if (animationData.assets && imageAssets) {
        animationData.assets.forEach((asset: any) => {
          if (asset.p && imageAssets[asset.p]) {
            asset.u = '';
            asset.p = imageAssets[asset.p];
          }
        });
      }

      clearAnimation();

      if (containerRef.current) {
        const animation = lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: true,
          autoplay: false,
          animationData: animationData,
        });

        animationRef.current = animation;
        setTotalFrames(Math.floor(animation.totalFrames));

        animation.addEventListener('enterFrame', () => {
          setCurrentFrame(Math.floor(animation.currentFrame));
        });
      }
    } catch (error) {
      console.error('Failed to load JSON:', error);
      alert(t.tools.lottie.errors.loadJsonFailed);
    }
  };

  // 加载图片资源
  const handleImageLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const assets: { [key: string]: string } = {};
    let loadedCount = 0;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          assets[file.name] = e.target.result as string;
          loadedCount++;

          if (loadedCount === files.length) {
            setImageAssets(assets);
            setShowToast(true);
            setTimeout(() => {
              setShowToast(false);
            }, 2000);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // 加载 JSON 文件
  const handleJSONLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      loadJSON(file);
    }
  };

  // 播放控制
  const handlePlay = () => {
    if (animationRef.current) {
      animationRef.current.play();
      setIsPlaying(true);
    }
  };

  const handlePause = () => {
    if (animationRef.current) {
      animationRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (animationRef.current) {
      animationRef.current.stop();
      setIsPlaying(false);
      setCurrentFrame(0);
    }
  };

  // 进度条拖动
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const frame = Number(e.target.value);
    if (animationRef.current) {
      animationRef.current.goToAndStop(frame, true);
      setCurrentFrame(frame);
    }
  };

  // 清理
  useEffect(() => {
    return () => {
      clearAnimation();
    };
  }, []);

  const styles = {
    container: {
      maxWidth: '900px',
      margin: '0 auto',
    },
    title: {
      fontSize: '1.75rem',
      fontWeight: 'bold' as const,
      color: colors.textPrimary,
      marginBottom: '1.5rem',
      textAlign: 'center' as const,
    },
    previewSection: {
      marginBottom: '1.5rem',
    },
    previewContainer: {
      width: '100%',
      minHeight: `400px`,
      border: `2px solid ${colors.primary}`,
      borderRadius: '0.5rem',
      backgroundColor: colors.cardBg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'relative' as const,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: '1rem',
    },
    controlSection: {
      backgroundColor: colors.cardBg,
      border: `1px solid ${colors.cardBorder}`,
      borderRadius: '0.5rem',
      padding: '1rem',
      marginBottom: '1rem',
    },
    controlButtons: {
      display: 'flex',
      gap: '0.75rem',
      justifyContent: 'center',
    },
    button: {
      padding: '0.75rem 1.5rem',
      backgroundColor: colors.primary,
      color: '#ffffff',
      border: 'none',
      borderRadius: '0.375rem',
      fontSize: '1rem',
      fontWeight: '500' as const,
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    },
    buttonSecondary: {
      backgroundColor: colors.secondary,
    },
    buttonDanger: {
      backgroundColor: colors.error,
    },
    progressSection: {
      backgroundColor: colors.cardBg,
      border: `1px solid ${colors.cardBorder}`,
      borderRadius: '0.5rem',
      padding: '1rem',
      marginBottom: '1rem',
    },
    progressLabel: {
      fontSize: '0.875rem',
      color: colors.secondary,
      marginBottom: '0.5rem',
      textAlign: 'center' as const,
    },
    progressSlider: {
      width: '100%',
      height: '6px',
      borderRadius: '3px',
      background: colors.cardBorder,
      outline: 'none',
      WebkitAppearance: 'none' as const,
      appearance: 'none' as const,
      cursor: 'pointer',
    },
    importSection: {
      backgroundColor: colors.cardBg,
      border: `1px solid ${colors.cardBorder}`,
      borderRadius: '0.5rem',
      padding: '1rem',
    },
    importButtons: {
      display: 'flex',
      gap: '0.75rem',
      justifyContent: 'center',
      flexWrap: 'wrap' as const,
    },
    hiddenInput: {
      display: 'none',
    },
    toast: {
      position: 'fixed' as const,
      bottom: '2rem',
      right: '2rem',
      backgroundColor: '#10b981',
      color: '#ffffff',
      padding: '1rem 1.5rem',
      borderRadius: '0.5rem',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      fontSize: '1rem',
      fontWeight: '500' as const,
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      opacity: 1,
      transition: 'opacity 0.3s ease-out',
    },
  };

  const sliderStyles = `
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: ${colors.primary};
      cursor: pointer;
    }

    input[type="range"]::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: ${colors.primary};
      cursor: pointer;
      border: none;
    }
  `;

  return (
    <>
      <style>{sliderStyles}</style>
      <div style={styles.container}>
        {/* Preview Area */}
        <div style={styles.previewSection}>
          <div style={styles.previewContainer} ref={containerRef}>
            {!animationRef.current && (
              <div style={styles.emptyText}>{t.tools.lottie.empty}</div>
            )}
          </div>
        </div>

        {/* Playback Controls */}
        <div style={styles.controlSection}>
          <div style={styles.controlButtons}>
            <button
              style={styles.button}
              onClick={handlePlay}
              disabled={!animationRef.current}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
            >
              ▶ {t.tools.lottie.play}
            </button>
            <button
              style={{ ...styles.button, ...styles.buttonSecondary }}
              onClick={handlePause}
              disabled={!animationRef.current}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#4b5563')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#6b7280')}
            >
              ⏸ {t.tools.lottie.pause}
            </button>
            <button
              style={{ ...styles.button, ...styles.buttonSecondary }}
              onClick={handleStop}
              disabled={!animationRef.current}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#4b5563')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#6b7280')}
            >
              ⏹ {t.tools.lottie.stop}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={styles.progressSection}>
          <div style={styles.progressLabel}>
            {t.tools.lottie.frameLabel} {currentFrame} / {totalFrames}
          </div>
          <input
            type="range"
            min="0"
            max={totalFrames}
            value={currentFrame}
            onChange={handleProgressChange}
            style={styles.progressSlider}
            disabled={!animationRef.current}
          />
        </div>

        {/* Import Buttons */}
        <div style={styles.importSection}>
          <div style={styles.importButtons}>
            <button
              style={styles.button}
              onClick={() => imageInputRef.current?.click()}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
            >
              {t.tools.lottie.loadImages}
            </button>
            <button
              style={styles.button}
              onClick={() => jsonInputRef.current?.click()}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
            >
              {t.tools.lottie.loadJSON}
            </button>
            <button
              style={{ ...styles.button, ...styles.buttonDanger }}
              onClick={clearAnimation}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#dc2626')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ef4444')}
            >
              {t.tools.lottie.clearPreview}
            </button>
          </div>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          {...({ webkitdirectory: '' } as any)}
          onChange={handleImageLoad}
          style={styles.hiddenInput}
        />
        <input
          ref={jsonInputRef}
          type="file"
          accept=".json"
          onChange={handleJSONLoad}
          style={styles.hiddenInput}
        />
      </div>

      {/* Toast 提示 */}
      {showToast && (
        <div style={styles.toast}>
          <span>✓</span>
          <span>{t.tools.lottie.toast.imagesLoaded}</span>
        </div>
      )}
    </>
  );
}
