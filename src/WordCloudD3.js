import React, { useRef, useEffect } from "react";
import * as d3 from "d3";
import cloud from "d3-cloud";

function WordCloudD3({ words = [], highlightedWord, onWordHighlightComplete }) {
  // Определяем, мобильное ли устройство (ширина окна меньше 768px)
  const isMobile = window.innerWidth < 768;
  // На мобильном используем 80% от высоты окна, а на больших экранах – 50%
  const cloudWidth = Math.min(window.innerWidth * 0.8, 1200);
  const cloudHeight = isMobile
    ? Math.min(window.innerHeight * 0.8, 800)
    : Math.min(window.innerHeight * 0.5, 800);

  const svgRef = useRef(null);

  useEffect(() => {
    // Очищаем SVG от предыдущего содержимого
    d3.select(svgRef.current).selectAll("*").remove();
    if (!words || words.length === 0) return;

    // Формируем копию массива кандидатов.
    // Если ключевое слово отсутствует, добавляем его, чтобы алгоритм его учитывал.
    let candidateWords = words.slice();
    if (highlightedWord && !candidateWords.some((d) => d.text === highlightedWord)) {
      const currentMax = d3.max(candidateWords, (d) => d.importance) || 100;
      candidateWords.push({ text: highlightedWord, importance: currentMax });
    }

    // Определяем минимальное и максимальное значение важности
    const minImp = d3.min(candidateWords, (d) => d.importance) || 0;
    const maxImp = d3.max(candidateWords, (d) => d.importance) || 100;

    // Шкала для размеров шрифта
    const fontScale = d3
      .scalePow()
      .exponent(0.5)
      .domain([minImp, maxImp])
      .range([50, 200]);

    // Настраиваем генератор облака слов
    const layout = cloud()
      .size([cloudWidth, cloudHeight])
      .words(
        candidateWords.map((wordObj) => ({
          text: wordObj.text,
          size: fontScale(wordObj.importance),
        }))
      )
      .padding(2)
      .rotate(() => (Math.random() > 0.5 ? 0 : 90))
      .font("Impact")
      .fontSize((d) => d.size)
      .on("end", draw);

    layout.start();

    function draw(wordsArr) {
      const svgEl = d3
        .select(svgRef.current)
        .append("g")
        .attr("transform", `translate(${cloudWidth / 2}, ${cloudHeight / 2})`);

      // Добавляем фильтр неонового свечения
      svgEl
        .append("defs")
        .html(`
          <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        `);

      // Отрисовываем все слова
      const textSelection = svgEl
        .selectAll("text")
        .data(wordsArr)
        .enter()
        .append("text")
        .style("font-family", "Impact")
        .style("font-size", (d) => `${d.size}px`)
        .attr("text-anchor", "middle")
        .attr("transform", (d) => `translate(${d.x}, ${d.y})rotate(${d.rotate})`)
        .text((d) => d.text)
        .style("opacity", 1)
        .style("fill", "#0ff")
        .style("filter", "url(#neonGlow)");

      // Перемещаем элемент с ключевым словом наверх, чтобы он не перекрывался другими
      textSelection.filter((d) => d.text === highlightedWord).raise();

      // Остальные слова будут постепенно исчезать
      const fadingWords = textSelection.filter((d) => d.text !== highlightedWord);
      const animationPromises = [];

      fadingWords.each(function (_, i, nodes) {
        const promise = new Promise((resolve) => {
          d3.select(nodes[i])
            .transition()
            .duration(1000)
            .delay(2000 + i * 500)
            .style("opacity", 0)
            .on("end", resolve);
        });
        animationPromises.push(promise);
      });

      // Меняем цвет ключевого слова через заданную задержку
      const highlightTextSelection = textSelection.filter((d) => d.text === highlightedWord);
      setTimeout(() => {
        highlightTextSelection.transition().duration(500).style("fill", "red");
      }, 2000 + fadingWords.size() * 500 - 500);

      // После завершения анимаций вызываем callback
      Promise.all(animationPromises).then(() => {
        if (onWordHighlightComplete) {
          onWordHighlightComplete(highlightedWord);
        }
      });
    }
  }, [words, highlightedWord, onWordHighlightComplete, cloudWidth, cloudHeight]);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox={`0 0 ${cloudWidth} ${cloudHeight}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ borderRadius: "12px", display: "block" }}
    />
  );
}

export default WordCloudD3;
