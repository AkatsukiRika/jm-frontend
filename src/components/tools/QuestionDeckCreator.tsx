"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useThemeColors } from "@/lib/hooks/useThemeColors";
import { useTranslation } from "@/components/I18nProvider";
import toast from "react-hot-toast";
import {
  getDeck,
  listFiles,
  updateDeck,
  removeFile,
  getDeckDataOnly,
} from "@/lib/api/questionDeck";
import type {
  QuestionCard,
  QuestionDeckContent,
} from "@/lib/types/questionDeck";

// 简单的长按 Hook：按住 delay 毫秒触发长按，否则短按
function useLongPress(
  onLongPress: () => void,
  onClick: () => void,
  { delay = 600 }: { delay?: number } = {}
) {
  const timerRef = useRef<number | null>(null);
  const longPressedRef = useRef(false);

  const start = () => {
    longPressedRef.current = false;
    timerRef.current = window.setTimeout(() => {
      longPressedRef.current = true;
      onLongPress();
    }, delay);
  };

  const clear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const onMouseDown = () => start();
  const onMouseUp = () => {
    if (!longPressedRef.current) onClick();
    clear();
  };
  const onMouseLeave = () => clear();

  const onTouchStart = () => start();
  const onTouchEnd = () => {
    if (!longPressedRef.current) onClick();
    clear();
  };

  return { onMouseDown, onMouseUp, onMouseLeave, onTouchStart, onTouchEnd };
}

export default function QuestionDeckCreator() {
  const colors = useThemeColors();
  const { t } = useTranslation();

  const [filenames, setFilenames] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [cards, setCards] = useState<QuestionCard[]>([{ question: "", answer: "", due_time: 0 }]);
  const [currentIndex, setCurrentIndex] = useState(0); // 0-based

  const [loadingList, setLoadingList] = useState(false);
  const [loadingDeck, setLoadingDeck] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [removing, setRemoving] = useState(false);

  const [showJumpDialog, setShowJumpDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [newFilename, setNewFilename] = useState("");

  const total = cards.length;
  const progressLabel = `${Math.min(currentIndex + 1, total)}/${total}`;

  const styles = useMemo(() => {
    return {
      container: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "1rem",
        color: colors.textPrimary,
      },
      header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
      },
      leftGroup: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        minWidth: 220,
      },
      select: {
        padding: "0.5rem 0.75rem",
        borderRadius: 8,
        border: `1px solid ${colors.cardBorder}`,
        background: colors.cardBg,
        color: colors.textPrimary,
      },
      centerControls: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
      },
      controlButton: {
        padding: "0.5rem 0.75rem",
        borderRadius: 8,
        border: `1px solid ${colors.cardBorder}`,
        background: colors.background,
        color: colors.textPrimary,
        cursor: "pointer",
      },
      progress: {
        padding: "0.5rem 0.75rem",
        borderRadius: 8,
        border: `1px solid ${colors.cardBorder}`,
        background: colors.cardBg,
        color: colors.textPrimary,
        userSelect: "none" as const,
        cursor: "pointer",
        minWidth: 80,
        textAlign: "center" as const,
        fontVariantNumeric: "tabular-nums" as const,
      },
      rightGroup: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
      },
      primaryButton: {
        padding: "0.5rem 0.75rem",
        borderRadius: 8,
        border: `1px solid ${colors.primary}`,
        background: colors.primary,
        color: "#fff",
        cursor: "pointer",
        fontWeight: 600,
      },
      editor: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "0.75rem",
        minHeight: 420,
      },
      areaWrap: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "0.75rem",
        flex: 1,
      },
      textarea: {
        flex: 1,
        width: "100%",
        resize: "vertical" as const,
        minHeight: 160,
        padding: "0.75rem 1rem",
        borderRadius: 8,
        border: `1px solid ${colors.cardBorder}`,
        background: colors.background,
        color: colors.textPrimary,
        fontSize: "1rem",
        lineHeight: 1.4,
      },
      label: {
        color: colors.secondary,
        fontSize: "0.9rem",
      },
      overlay: {
        position: "fixed" as const,
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      },
      dialog: {
        width: "min(640px, 90vw)",
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: 12,
        padding: "1rem",
        boxShadow: `0 10px 30px ${colors.cardShadow}`,
      },
      dialogHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "0.75rem",
      },
      grid: {
        display: "grid",
        gridTemplateColumns: "repeat(6, 1fr)",
        gap: "0.5rem",
        maxHeight: "60vh",
        overflowY: "auto" as const,
      },
      gridBtn: {
        padding: "0.5rem",
        borderRadius: 8,
        border: `1px solid ${colors.cardBorder}`,
        background: colors.background,
        color: colors.textPrimary,
        cursor: "pointer",
      },
      hint: {
        color: colors.secondary,
        fontSize: "0.85rem",
      },
      small: {
        fontSize: "0.85rem",
        color: colors.secondary,
      },
      danger: {
        color: "#b91c1c",
      },
      disabled: {
        opacity: 0.5,
        cursor: "not-allowed",
      },
    } as const;
  }, [colors, total, currentIndex]);

  // 初始化加载文件列表
  useEffect(() => {
    const load = async () => {
      setLoadingList(true);
      try {
        const resp = await listFiles();
        if (resp.code === 0 && resp.data?.filenames) {
          setFilenames(resp.data.filenames);
          if (resp.data.filenames.length > 0) {
            // 默认选择第一个文件并加载
            const first = resp.data.filenames[0];
            setSelectedFile(first);
          }
        } else {
          toast.error(`${t.tools.questionDeck.errors.listFailed}: ${resp.message}`);
        }
      } catch (e) {
        console.error(e);
        toast.error(t.tools.questionDeck.errors.listException);
      } finally {
        setLoadingList(false);
      }
    };
    load();
  }, []);

  // 选择文件后加载题组
  useEffect(() => {
    const loadDeckContent = async (filename: string) => {
      if (!filename) return;
      setLoadingDeck(true);
      try {
        const resp = await getDeck(filename);
        if (resp.code === 0 && resp.data?.question_deck) {
          const content = resp.data as QuestionDeckContent;
          const list = content.question_deck?.cards ?? [];
          setCards(list.length > 0 ? list : [{ question: "", answer: "", due_time: 0 }]);
          setCurrentIndex(0);
        } else {
          toast.error(`${t.tools.questionDeck.errors.getFailed}: ${resp.message}`);
          setCards([{ question: "", answer: "", due_time: 0 }]);
          setCurrentIndex(0);
        }
      } catch (e) {
        console.error(e);
        toast.error(t.tools.questionDeck.errors.getException);
        setCards([{ question: "", answer: "", due_time: 0 }]);
        setCurrentIndex(0);
      } finally {
        setLoadingDeck(false);
      }
    };

    if (selectedFile) {
      loadDeckContent(selectedFile);
    }
  }, [selectedFile]);

  // 操作：删除当前题（短按），长按删除文件
  const handleDeleteShort = () => {
    if (total === 0) return;
    const newCards = cards.slice();
    newCards.splice(currentIndex, 1);
    if (newCards.length === 0) {
      newCards.push({ question: "", answer: "", due_time: 0 });
    }
    const newIndex = Math.min(currentIndex, newCards.length - 1);
    setCards(newCards);
    setCurrentIndex(newIndex);
  };

  const handleDeleteLong = () => {
    if (!selectedFile) return;
    setDeleteStep(1);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedFile) return;
    setRemoving(true);
    try {
      const resp = await removeFile(selectedFile);
      if (resp.code === 0) {
        const nextFiles = filenames.filter((f) => f !== selectedFile);
        setFilenames(nextFiles);
        if (nextFiles.length > 0) {
          setSelectedFile(nextFiles[0]);
        } else {
          setSelectedFile("");
          setCards([{ question: "", answer: "", due_time: 0 }]);
          setCurrentIndex(0);
        }
        setShowDeleteDialog(false);
      } else {
        toast.error(`${t.tools.questionDeck.errors.deleteFailed}: ${resp.message}`);
      }
    } catch (e) {
      console.error(e);
      toast.error(t.tools.questionDeck.errors.deleteException);
    } finally {
      setRemoving(false);
    }
  };

  const deleteHandlers = useLongPress(handleDeleteLong, handleDeleteShort);

  // 操作：新增题目（短按），长按新建题组文件
  const handleAddShort = () => {
    const newCards = cards.concat({ question: "", answer: "", due_time: 0 });
    setCards(newCards);
    setCurrentIndex(newCards.length - 1);
  };

  const handleAddLong = () => {
    setNewFilename("");
    setShowNewFileDialog(true);
  };

  const confirmCreateNew = async () => {
    const filename = newFilename.trim();
    if (!filename) return;
    const content: QuestionDeckContent = {
      question_deck: { cards: [{ question: "", answer: "", due_time: 0 }] },
    };
    setSaving(true);
    try {
      const resp = await updateDeck(filename, content);
      if (resp.code === 0) {
        const listResp = await listFiles();
        if (listResp.code === 0 && listResp.data?.filenames) {
          setFilenames(listResp.data.filenames);
        }
        setSelectedFile(filename);
        setShowNewFileDialog(false);
      } else {
        toast.error(`${t.tools.questionDeck.errors.createFailed}: ${resp.message}`);
      }
    } catch (e) {
      console.error(e);
      toast.error(t.tools.questionDeck.errors.createException);
    } finally {
      setSaving(false);
    }
  };

  const addHandlers = useLongPress(handleAddLong, handleAddShort);

  const handlePrev = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const handleNext = () => setCurrentIndex((i) => Math.min(total - 1, i + 1));

  const handleSave = async () => {
    if (!selectedFile) {
      toast.error(t.tools.questionDeck.errors.needSelect);
      return;
    }
    const content: QuestionDeckContent = { question_deck: { cards } };
    setSaving(true);
    try {
      const resp = await updateDeck(selectedFile, content);
      if (resp.code === 0) {
        // 成功提示
        // eslint-disable-next-line no-alert
        toast.success(t.tools.questionDeck.toasts.saveSuccess);
      } else {
        toast.error(`${t.tools.questionDeck.errors.saveFailed}: ${resp.message}`);
      }
    } catch (e) {
      console.error(e);
      toast.error(t.tools.questionDeck.errors.saveException);
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedFile) {
      toast.error(t.tools.questionDeck.errors.needSelectToDownload);
      return;
    }
    setDownloading(true);
    try {
      const dataOnly = await getDeckDataOnly(selectedFile);
      if (!dataOnly) throw new Error(t.tools.questionDeck.errors.downloadFailed);
      const blob = new Blob([JSON.stringify(dataOnly, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = selectedFile.endsWith(".json") ? selectedFile : `${selectedFile}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast.error(t.tools.questionDeck.errors.downloadException);
    } finally {
      setDownloading(false);
    }
  };

  const updateCurrentCard = (patch: Partial<QuestionCard>) => {
    setCards((prev) => {
      const next = prev.slice();
      next[currentIndex] = { ...next[currentIndex], ...patch };
      return next;
    });
  };

  return (
    <div style={styles.container}>
      {/* 顶部栏 */}
      <div style={styles.header}>
        {/* 左侧：文件选择 */}
        <div style={styles.leftGroup}>
          <span style={styles.small}>{t.tools.questionDeck.labels.file}：</span>
          <select
            style={styles.select as React.CSSProperties}
            value={selectedFile}
            onChange={(e) => setSelectedFile(e.target.value)}
            disabled={loadingList || removing || loadingDeck}
          >
            {filenames.length === 0 && <option value="">{t.tools.questionDeck.labels.noFile}</option>}
            {filenames.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {/* 中间：控件区 */}
        <div style={styles.centerControls}>
          <button
            title={t.tools.questionDeck.buttons.deleteTip}
            style={{
              ...(styles.controlButton as React.CSSProperties),
              ...(removing ? (styles.disabled as React.CSSProperties) : {}),
              ...(selectedFile ? {} : (styles.disabled as React.CSSProperties)),
              ...(total > 0 ? {} : (styles.disabled as React.CSSProperties)),
            }}
            disabled={!selectedFile || removing || total === 0}
            {...deleteHandlers}
          >
            ➖
          </button>
          <button
            title={t.tools.questionDeck.buttons.prev}
            style={{
              ...(styles.controlButton as React.CSSProperties),
              ...(currentIndex <= 0 ? (styles.disabled as React.CSSProperties) : {}),
            }}
            disabled={currentIndex <= 0}
            onClick={handlePrev}
          >
            ⬅️
          </button>
          <div
            title={t.tools.questionDeck.dialog.quickJump}
            style={styles.progress as React.CSSProperties}
            onClick={() => total > 0 && setShowJumpDialog(true)}
          >
            {loadingDeck ? t.tools.questionDeck.progress.loading : progressLabel}
          </div>
          <button
            title={t.tools.questionDeck.buttons.next}
            style={{
              ...(styles.controlButton as React.CSSProperties),
              ...(currentIndex >= total - 1 ? (styles.disabled as React.CSSProperties) : {}),
            }}
            disabled={currentIndex >= total - 1}
            onClick={handleNext}
          >
            ➡️
          </button>
          <button
            title={t.tools.questionDeck.buttons.addTip}
            style={styles.controlButton as React.CSSProperties}
            {...addHandlers}
          >
            ➕
          </button>
          <button
            title={t.tools.questionDeck.buttons.download}
            style={{
              ...(styles.controlButton as React.CSSProperties),
              ...(downloading || !selectedFile
                ? (styles.disabled as React.CSSProperties)
                : {}),
            }}
            disabled={!selectedFile || downloading}
            onClick={handleDownload}
          >
            ⬇️
          </button>
        </div>

        {/* 右侧：保存 */}
        <div style={styles.rightGroup}>
          <button
            style={{
              ...(styles.primaryButton as React.CSSProperties),
              ...(saving || !selectedFile ? (styles.disabled as React.CSSProperties) : {}),
            }}
            disabled={!selectedFile || saving}
            onClick={handleSave}
          >
            {saving ? t.tools.questionDeck.buttons.saving : t.tools.questionDeck.buttons.save}
          </button>
        </div>
      </div>

      {/* 编辑区域：上下两个大文本框，1:1 */}
      <div style={styles.editor}>
        <div style={styles.areaWrap}>
          <span style={styles.label}>{t.tools.questionDeck.labels.question}</span>
          <textarea
            placeholder={t.tools.questionDeck.placeholders.question}
            style={styles.textarea as React.CSSProperties}
            value={cards[currentIndex]?.question ?? ""}
            onChange={(e) => updateCurrentCard({ question: e.target.value })}
          />
        </div>
        <div style={styles.areaWrap}>
          <span style={styles.label}>{t.tools.questionDeck.labels.answer}</span>
          <textarea
            placeholder={t.tools.questionDeck.placeholders.answer}
            style={styles.textarea as React.CSSProperties}
            value={cards[currentIndex]?.answer ?? ""}
            onChange={(e) => updateCurrentCard({ answer: e.target.value })}
          />
        </div>
      </div>

      {/* 跳转对话框 */}
      {showJumpDialog && (
        <div style={styles.overlay} onClick={() => setShowJumpDialog(false)}>
          <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <div style={styles.dialogHeader}>
              <strong>{t.tools.questionDeck.dialog.quickJump}</strong>
              <button
                style={styles.controlButton as React.CSSProperties}
                onClick={() => setShowJumpDialog(false)}
              >
                {t.tools.questionDeck.buttons.close}
              </button>
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <span style={styles.hint}>{t.tools.questionDeck.dialog.hintPrefix} {total} {t.tools.questionDeck.dialog.hintSuffix}</span>
            </div>
            <div style={styles.grid}>
              {cards.map((_, idx) => (
                <button
                  key={idx}
                  style={{
                    ...(styles.gridBtn as React.CSSProperties),
                    ...(idx === currentIndex ? { borderColor: colors.primary, color: colors.primary } : {}),
                  }}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setShowJumpDialog(false);
                  }}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 删除文件二次确认对话框 */}
      {showDeleteDialog && selectedFile && (
        <div style={styles.overlay} onClick={() => setShowDeleteDialog(false)}>
          <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <div style={styles.dialogHeader}>
              <strong>{t.tools.questionDeck.buttons.deleteTip}</strong>
            </div>
            {deleteStep === 1 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  {t.tools.questionDeck.confirm.deleteDeckPrefix} “{selectedFile}” {t.tools.questionDeck.confirm.deleteDeckSuffix}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button
                    style={styles.controlButton as React.CSSProperties}
                    onClick={() => setShowDeleteDialog(false)}
                  >
                    {t.tools.questionDeck.buttons.close}
                  </button>
                  <button
                    style={styles.primaryButton as React.CSSProperties}
                    onClick={() => setDeleteStep(2)}
                  >
                    {t.tools.questionDeck.buttons.next}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={styles.danger as React.CSSProperties}>{t.tools.questionDeck.confirm.irreversible}</div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button
                    style={styles.controlButton as React.CSSProperties}
                    onClick={() => setShowDeleteDialog(false)}
                  >
                    {t.tools.questionDeck.buttons.close}
                  </button>
                  <button
                    style={styles.primaryButton as React.CSSProperties}
                    onClick={confirmDelete}
                    disabled={removing}
                  >
                    {removing ? t.tools.questionDeck.buttons.confirming : t.tools.questionDeck.buttons.confirm}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 新建文件对话框 */}
      {showNewFileDialog && (
        <div style={styles.overlay} onClick={() => setShowNewFileDialog(false)}>
          <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <div style={styles.dialogHeader}>
              <strong>{t.tools.questionDeck.buttons.addTip}</strong>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={styles.small}>{t.tools.questionDeck.prompts.newFilename}</label>
              <input
                type="text"
                value={newFilename}
                onChange={(e) => setNewFilename(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 8,
                  border: `1px solid ${colors.cardBorder}`,
                  background: colors.background,
                  color: colors.textPrimary,
                }}
                placeholder="my_deck.json"
              />
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  style={styles.controlButton as React.CSSProperties}
                  onClick={() => setShowNewFileDialog(false)}
                >
                  {t.tools.questionDeck.buttons.close}
                </button>
                <button
                  style={styles.primaryButton as React.CSSProperties}
                  onClick={confirmCreateNew}
                  disabled={saving || !newFilename.trim()}
                >
                  {saving ? t.tools.questionDeck.buttons.saving : t.tools.questionDeck.buttons.confirm}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
