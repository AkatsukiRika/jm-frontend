'use client';

import { useState, useEffect } from 'react';

interface BMICategory {
  name: string;
  color: string;
  textColor: string;
  range: string;
}

export default function BMICalculator() {
  const [height, setHeight] = useState(170); // cm
  const [weight, setWeight] = useState(65.0); // kg
  const [isDraggingHeight, setIsDraggingHeight] = useState(false);
  const [isDraggingWeight, setIsDraggingWeight] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartValue, setDragStartValue] = useState(0);

  // 计算 BMI
  const calculateBMI = (): number => {
    const heightInMeters = height / 100;
    return weight / (heightInMeters * heightInMeters);
  };

  // 获取 BMI 分类
  const getBMICategory = (bmi: number): BMICategory => {
    if (bmi < 18.5) {
      return {
        name: 'Underweight',
        color: '#dbeafe',
        textColor: '#1e40af',
        range: '< 18.5',
      };
    } else if (bmi < 25) {
      return {
        name: 'Normal Weight',
        color: '#d1fae5',
        textColor: '#065f46',
        range: '18.5 - 24.9',
      };
    } else if (bmi < 30) {
      return {
        name: 'Overweight',
        color: '#fed7aa',
        textColor: '#92400e',
        range: '25 - 29.9',
      };
    } else {
      return {
        name: 'Obese',
        color: '#fecaca',
        textColor: '#991b1b',
        range: '≥ 30',
      };
    }
  };

  const bmi = calculateBMI();
  const category = getBMICategory(bmi);

  // 生成标尺刻度
  const generateRulerMarks = (min: number, max: number, step: number, mediumStep: number, largeStep: number) => {
    const marks = [];
    let value = min;
    while (value <= max) {
      const roundedValue = Math.round(value * 10) / 10; // 避免浮点精度问题
      marks.push({
        value: roundedValue,
        isLarge: roundedValue % largeStep === 0,
        isMedium: roundedValue % mediumStep === 0,
      });
      value += step;
    }
    return marks;
  };

  const heightMarks = generateRulerMarks(100, 250, 1, 1, 10);
  const weightMarks = generateRulerMarks(30, 200, 1, 1, 10); // 每 1kg 一个刻度

  // 每个刻度的像素宽度
  const HEIGHT_PIXELS_PER_UNIT = 8; // 每 1cm 占 8px
  const WEIGHT_PIXELS_PER_UNIT = 8; // 每 1kg 占 8px

  // 计算标尺的偏移量（让当前值对应到中间指针位置）
  const getHeightRulerOffset = (value: number, min: number) => {
    return -(value - min) * HEIGHT_PIXELS_PER_UNIT;
  };

  const getWeightRulerOffset = (value: number, min: number) => {
    return -(value - min) * WEIGHT_PIXELS_PER_UNIT;
  };

  // 开始拖动 - 身高
  const handleHeightDragStart = (clientX: number) => {
    setIsDraggingHeight(true);
    setDragStartX(clientX);
    setDragStartValue(height);
  };

  // 开始拖动 - 体重
  const handleWeightDragStart = (clientX: number) => {
    setIsDraggingWeight(true);
    setDragStartX(clientX);
    setDragStartValue(weight);
  };

  // 全局事件监听
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingHeight) {
        e.preventDefault();
        const deltaX = e.clientX - dragStartX;
        const deltaValue = -deltaX / HEIGHT_PIXELS_PER_UNIT;
        let newValue = dragStartValue + deltaValue;
        newValue = Math.max(100, Math.min(250, newValue));
        setHeight(newValue);
      } else if (isDraggingWeight) {
        e.preventDefault();
        const deltaX = e.clientX - dragStartX;
        const deltaValue = -deltaX / WEIGHT_PIXELS_PER_UNIT;
        let newValue = dragStartValue + deltaValue;
        newValue = Math.max(30, Math.min(200, newValue));
        setWeight(newValue);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingHeight) {
        e.preventDefault();
        const deltaX = e.touches[0].clientX - dragStartX;
        const deltaValue = -deltaX / HEIGHT_PIXELS_PER_UNIT;
        let newValue = dragStartValue + deltaValue;
        newValue = Math.max(100, Math.min(250, newValue));
        setHeight(newValue);
      } else if (isDraggingWeight) {
        e.preventDefault();
        const deltaX = e.touches[0].clientX - dragStartX;
        const deltaValue = -deltaX / WEIGHT_PIXELS_PER_UNIT;
        let newValue = dragStartValue + deltaValue;
        newValue = Math.max(30, Math.min(200, newValue));
        setWeight(newValue);
      }
    };

    const handleMouseUp = () => {
      // 吸附效果：拖动结束时自动对齐到整数或 0.1
      if (isDraggingHeight) {
        setHeight(Math.round(height));
      } else if (isDraggingWeight) {
        setWeight(Math.round(weight * 10) / 10);
      }
      setIsDraggingHeight(false);
      setIsDraggingWeight(false);
    };

    const handleTouchEnd = () => {
      // 吸附效果：拖动结束时自动对齐到整数或 0.1
      if (isDraggingHeight) {
        setHeight(Math.round(height));
      } else if (isDraggingWeight) {
        setWeight(Math.round(weight * 10) / 10);
      }
      setIsDraggingHeight(false);
      setIsDraggingWeight(false);
    };

    if (isDraggingHeight || isDraggingWeight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDraggingHeight, isDraggingWeight, dragStartX, dragStartValue, height, weight]);

  const styles = {
    container: {
      maxWidth: '700px',
      margin: '0 auto',
    },
    title: {
      fontSize: '1.75rem',
      fontWeight: 'bold' as const,
      color: '#1f2937',
      marginBottom: '2rem',
      textAlign: 'center' as const,
    },
    bmiDisplay: {
      backgroundColor: category.color,
      borderRadius: '1rem',
      padding: '2.5rem 2rem',
      marginBottom: '2.5rem',
      textAlign: 'center' as const,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.3s ease',
    },
    bmiValue: {
      fontSize: '4rem',
      fontWeight: 'bold' as const,
      color: category.textColor,
      marginBottom: '0.5rem',
      lineHeight: 1,
    },
    bmiCategory: {
      fontSize: '1.5rem',
      fontWeight: '600' as const,
      color: category.textColor,
      marginBottom: '0.25rem',
    },
    bmiRange: {
      fontSize: '1rem',
      color: category.textColor,
      opacity: 0.8,
    },
    sliderSection: {
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '0.75rem',
      padding: '1.75rem',
      marginBottom: '1.5rem',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    sliderHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1rem',
    },
    sliderLabel: {
      fontSize: '1.125rem',
      fontWeight: '600' as const,
      color: '#1f2937',
    },
    sliderValue: {
      fontSize: '1.5rem',
      fontWeight: 'bold' as const,
      color: '#3b82f6',
      fontFamily: 'monospace',
    },
    sliderUnit: {
      fontSize: '1rem',
      color: '#6b7280',
      marginLeft: '0.25rem',
    },
    rulerContainer: {
      position: 'relative' as const,
      paddingTop: '2rem',
      overflow: 'hidden' as const,
    },
    rulerWrapper: {
      position: 'relative' as const,
      height: '40px',
      backgroundColor: '#f9fafb',
      borderRadius: '4px',
      border: '1px solid #e5e7eb',
      overflow: 'hidden' as const,
      cursor: 'grab' as const,
      userSelect: 'none' as const,
    },
    rulerWrapperDragging: {
      cursor: 'grabbing' as const,
    },
    rulerTrack: {
      position: 'relative' as const,
      height: '100%',
      display: 'flex',
      alignItems: 'flex-end',
      transition: 'transform 0.1s ease-out',
    },
    heightRulerTrack: {
      paddingLeft: `calc(50% - ${HEIGHT_PIXELS_PER_UNIT / 2}px)`,
      paddingRight: `calc(50% - ${HEIGHT_PIXELS_PER_UNIT / 2}px)`,
    },
    weightRulerTrack: {
      paddingLeft: `calc(50% - ${WEIGHT_PIXELS_PER_UNIT / 2}px)`,
      paddingRight: `calc(50% - ${WEIGHT_PIXELS_PER_UNIT / 2}px)`,
    },
    heightRulerMark: {
      position: 'relative' as const,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      width: `${HEIGHT_PIXELS_PER_UNIT}px`,
      flexShrink: 0,
    },
    weightRulerMark: {
      position: 'relative' as const,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      width: `${WEIGHT_PIXELS_PER_UNIT}px`, // 现在是 8px
      flexShrink: 0,
    },
    rulerMarkLine: {
      width: '1px',
      backgroundColor: '#d1d5db',
    },
    rulerMarkLineLarge: {
      width: '2px',
      height: '24px',
      backgroundColor: '#9ca3af',
    },
    rulerMarkLineMedium: {
      width: '1px',
      height: '16px',
      backgroundColor: '#d1d5db',
    },
    rulerMarkLineSmall: {
      width: '1px',
      height: '8px',
      backgroundColor: '#e5e7eb',
    },
    rulerMarkLabel: {
      position: 'absolute' as const,
      top: '-1.75rem',
      fontSize: '0.875rem',
      color: '#1f2937',
      fontWeight: '600' as const,
      whiteSpace: 'nowrap' as const,
    },
    centerIndicator: {
      position: 'absolute' as const,
      top: '0',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '3px',
      height: '100%',
      backgroundColor: '#3b82f6',
      pointerEvents: 'none' as const,
      zIndex: 20,
      boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)',
    },
    centerIndicatorTop: {
      position: 'absolute' as const,
      top: '-8px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 0,
      height: 0,
      borderLeft: '6px solid transparent',
      borderRight: '6px solid transparent',
      borderTop: '8px solid #3b82f6',
    },
    centerIndicatorBottom: {
      position: 'absolute' as const,
      bottom: '-8px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 0,
      height: 0,
      borderLeft: '6px solid transparent',
      borderRight: '6px solid transparent',
      borderBottom: '8px solid #3b82f6',
    },
    legend: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '1rem',
      marginTop: '2rem',
    },
    legendItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.75rem',
      backgroundColor: '#f9fafb',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
    },
    legendColor: {
      width: '1rem',
      height: '1rem',
      borderRadius: '0.25rem',
      flexShrink: 0,
    },
    legendText: {
      flex: 1,
    },
    legendName: {
      fontWeight: '600' as const,
      color: '#1f2937',
    },
    legendRange: {
      color: '#6b7280',
      fontSize: '0.8125rem',
    },
  };

  return (
    <>
      <div style={styles.container}>
        <h2 style={styles.title}>BMI Calculator</h2>

        {/* BMI 显示区域 */}
        <div style={styles.bmiDisplay}>
          <div style={styles.bmiValue}>{bmi.toFixed(2)}</div>
          <div style={styles.bmiCategory}>{category.name}</div>
          <div style={styles.bmiRange}>BMI {category.range}</div>
        </div>

        {/* 身高标尺 */}
        <div style={styles.sliderSection}>
          <div style={styles.sliderHeader}>
            <span style={styles.sliderLabel}>Height</span>
            <div>
              <span style={styles.sliderValue}>{Math.round(height)}</span>
              <span style={styles.sliderUnit}>cm</span>
            </div>
          </div>
          <div style={styles.rulerContainer}>
            <div
              style={{
                ...styles.rulerWrapper,
                ...(isDraggingHeight ? styles.rulerWrapperDragging : {}),
              }}
              onMouseDown={(e) => handleHeightDragStart(e.clientX)}
              onTouchStart={(e) => handleHeightDragStart(e.touches[0].clientX)}
            >
              {/* 标尺刻度（可移动） */}
              <div
                style={{
                  ...styles.rulerTrack,
                  ...styles.heightRulerTrack,
                  transform: `translateX(${getHeightRulerOffset(height, 100)}px)`,
                }}
              >
                {heightMarks.map((mark, index) => (
                  <div key={index} style={styles.heightRulerMark}>
                    {mark.isLarge && (
                      <span style={styles.rulerMarkLabel}>{mark.value}</span>
                    )}
                    <div
                      style={
                        mark.isLarge
                          ? styles.rulerMarkLineLarge
                          : mark.isMedium
                          ? styles.rulerMarkLineMedium
                          : styles.rulerMarkLineSmall
                      }
                    />
                  </div>
                ))}
              </div>
              {/* 中心固定指针 */}
              <div style={styles.centerIndicator}>
                <div style={styles.centerIndicatorTop} />
                <div style={styles.centerIndicatorBottom} />
              </div>
            </div>
          </div>
        </div>

        {/* 体重标尺 */}
        <div style={styles.sliderSection}>
          <div style={styles.sliderHeader}>
            <span style={styles.sliderLabel}>Weight</span>
            <div>
              <span style={styles.sliderValue}>{(Math.round(weight * 10) / 10).toFixed(1)}</span>
              <span style={styles.sliderUnit}>kg</span>
            </div>
          </div>
          <div style={styles.rulerContainer}>
            <div
              style={{
                ...styles.rulerWrapper,
                ...(isDraggingWeight ? styles.rulerWrapperDragging : {}),
              }}
              onMouseDown={(e) => handleWeightDragStart(e.clientX)}
              onTouchStart={(e) => handleWeightDragStart(e.touches[0].clientX)}
            >
              {/* 标尺刻度（可移动） */}
              <div
                style={{
                  ...styles.rulerTrack,
                  ...styles.weightRulerTrack,
                  transform: `translateX(${getWeightRulerOffset(weight, 30)}px)`,
                }}
              >
                {weightMarks.map((mark, index) => (
                  <div key={index} style={styles.weightRulerMark}>
                    {mark.isLarge && (
                      <span style={styles.rulerMarkLabel}>{mark.value}</span>
                    )}
                    <div
                      style={
                        mark.isLarge
                          ? styles.rulerMarkLineLarge
                          : mark.isMedium
                          ? styles.rulerMarkLineMedium
                          : styles.rulerMarkLineSmall
                      }
                    />
                  </div>
                ))}
              </div>
              {/* 中心固定指针 */}
              <div style={styles.centerIndicator}>
                <div style={styles.centerIndicatorTop} />
                <div style={styles.centerIndicatorBottom} />
              </div>
            </div>
          </div>
        </div>

        {/* BMI 分类说明 */}
        <div style={styles.legend}>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendColor, backgroundColor: '#3b82f6' }} />
            <div style={styles.legendText}>
              <div style={styles.legendName}>Underweight</div>
              <div style={styles.legendRange}>BMI &lt; 18.5</div>
            </div>
          </div>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendColor, backgroundColor: '#10b981' }} />
            <div style={styles.legendText}>
              <div style={styles.legendName}>Normal Weight</div>
              <div style={styles.legendRange}>BMI 18.5 - 24.9</div>
            </div>
          </div>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendColor, backgroundColor: '#f59e0b' }} />
            <div style={styles.legendText}>
              <div style={styles.legendName}>Overweight</div>
              <div style={styles.legendRange}>BMI 25 - 29.9</div>
            </div>
          </div>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendColor, backgroundColor: '#ef4444' }} />
            <div style={styles.legendText}>
              <div style={styles.legendName}>Obese</div>
              <div style={styles.legendRange}>BMI ≥ 30</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
