import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Image as ImageIcon, Settings, Scissors, RefreshCw } from 'lucide-react';

export default function App() {
  const [image, setImage] = useState(null);
  const [originalImageObj, setOriginalImageObj] = useState(null);
  const [columns, setColumns] = useState(4);
  const [rows, setRows] = useState(3);
  const [tolerance, setTolerance] = useState(30);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedStickers, setProcessedStickers] = useState([]);
  const [processStep, setProcessStep] = useState('');

  const canvasRef = useRef(null);

  // 【樣式補丁】強迫注入 Tailwind 與基礎樣式，防止編譯失敗導致排版亂掉
  useEffect(() => {
    // 強制補丁：確保在手機端也能正確抓到樣式
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(script);
    }
    
    // 增加一個樣式補丁，解決某些手機瀏覽器背景變黑或文字跑掉的問題
    const style = document.createElement('style');
    style.innerHTML = `
      body { background-color: #f1f5f9 !important; margin: 0; padding: 0; }
      #root { width: 100%; overflow-x: hidden; }
    `;
    document.head.appendChild(style);
  }, []);
  function handleImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setImage(event.target.result);
          setOriginalImageObj(img);
          setProcessedStickers([]);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  const removeBackgroundFromEdges = (ctx, width, height, tolerance, bgR, bgG, bgB) => {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const visited = new Uint8Array(width * height);
    const queue = [];

    const isMatch = (idx) => {
      const r = data[idx], g = data[idx+1], b = data[idx+2], a = data[idx+3];
      if (a === 0) return true;
      return (Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB)) < tolerance * 3;
    };

    for (let x = 0; x < width; x++) { queue.push({x, y: 0}, {x, y: height - 1}); }
    for (let y = 0; y < height; y++) { queue.push({x: 0, y}, {x: width - 1, y}); }

    while (queue.length > 0) {
      const {x, y} = queue.pop();
      const idx = x + y * width;
      if (visited[idx]) continue;
      const pixelIndex = idx * 4;
      if (isMatch(pixelIndex)) {
        visited[idx] = 1;
        data[pixelIndex + 3] = 0;
        if (x > 0) queue.push({x: x - 1, y});
        if (x < width - 1) queue.push({x: x + 1, y});
        if (y > 0) queue.push({x, y: y - 1});
        if (y < height - 1) queue.push({x, y: y + 1});
      }
    }
    ctx.putImageData(imgData, 0, 0);
  };

  const processStickers = async () => {
    if (!originalImageObj) return;
    setIsProcessing(true);
    setProcessStep('正在處理...');
    await new Promise(r => setTimeout(r, 500));
    
    const imgW = originalImageObj.width, imgH = originalImageObj.height;
    const cellW = imgW / columns, cellH = imgH / rows;
    const results = [];

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cellW; tempCanvas.height = cellH;
    const tempCtx = tempCanvas.getContext('2d');

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        tempCtx.clearRect(0, 0, cellW, cellH);
        tempCtx.drawImage(originalImageObj, c * cellW, r * cellH, cellW, cellH, 0, 0, cellW, cellH);
        const bgColor = tempCtx.getImageData(0, 0, 1, 1).data;
        removeBackgroundFromEdges(tempCtx, cellW, cellH, tolerance, bgColor[0], bgColor[1], bgColor[2]);
        results.push({ id: r * columns + c, src: tempCanvas.toDataURL('image/png') });
      }
    }
    setProcessedStickers(results);
    setIsProcessing(false);
  };

  const downloadZip = () => {
    if (!window.JSZip) return alert("載入中");
    const zip = new window.JSZip();
    processedStickers.forEach((s, i) => zip.file(`sticker_${i+1}.png`, s.src.split(',')[1], {base64: true}));
    zip.generateAsync({type:"blob"}).then(c => {
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(c), download: "stickers.zip" });
      a.click();
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      {/* 橫幅使用品牌色 #131e2c */}
      <header style={{ backgroundColor: '#131e2c' }} className="p-6 md:p-10 text-white shadow-xl">
  <div className="max-w-6xl mx-auto flex flex-col items-center gap-3 md:gap-4">
    
    {/* Logo 容器：手機縮小，電腦放大 */}
    <div className="mb-2 flex justify-center w-full">
      <img 
        src="/logo.png" 
        alt="Great Spark Logo" 
        className="h-12 md:h-20 w-auto max-w-[200px] md:max-w-none object-contain drop-shadow-md" 
        onError={(e) => e.target.style.display = 'none'}
      />
    </div>

    {/* 標題文字：手機端縮小字體 (text-2xl)，電腦端放大 (md:text-4xl) */}
    <h1 className="text-2xl md:text-4xl text-white font-black tracking-tight flex items-center justify-center gap-2 text-center">
      <Scissors className="text-blue-400 w-6 h-6 md:w-10 md:h-10 shrink-0" />
      <span>LINE 貼圖製作神器</span>
    </h1>
    
    <p className="text-slate-400 text-sm md:text-base font-medium text-center">
      星策創新 Great Spark 技術支持
    </p>
  </div>
</header>
      <main className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-0">
          
          {/* 左側控制區 */}
          <div className="p-8 border-b lg:border-b-0 lg:border-r border-slate-100 space-y-8">
            <div className={`border-3 border-dashed rounded-2xl p-10 text-center transition-all ${image ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
              <input type="file" onChange={handleImageUpload} className="hidden" id="upload" />
              <label htmlFor="upload" className="cursor-pointer">
                <Upload className={`mx-auto w-12 h-12 mb-3 ${image ? 'text-blue-500' : 'text-slate-300'}`} />
                <span className="text-slate-700 font-bold block">{image ? "更換圖片" : "點擊上傳貼圖大圖"}</span>
              </label>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase">橫向格數</label>
                  <input type="number" value={columns} onChange={e => setColumns(e.target.value)} className="w-full p-3 rounded-xl border-2 border-slate-100 outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase">縱向格數</label>
                  <input type="number" value={rows} onChange={e => setRows(e.target.value)} className="w-full p-3 rounded-xl border-2 border-slate-100 outline-none focus:border-blue-500" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase block">去背容許值: {tolerance}</label>
                <input type="range" min="1" max="100" value={tolerance} onChange={e => setTolerance(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg appearance-none accent-blue-600" />
              </div>

              <button 
                onClick={processStickers} 
                disabled={!image || isProcessing}
                style={{ backgroundColor: image ? '#3b82f6' : '#cbd5e1' }}
                className="w-full text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
              >
                {isProcessing ? "處理中..." : "開始製作"}
              </button>
            </div>
          </div>

          {/* 右側預覽區 */}
          <div className="p-8 bg-slate-50 flex flex-col items-center justify-center min-h-[400px]">
            {image ? (
              <div className="relative border-4 border-white shadow-2xl rounded-lg overflow-hidden">
                <img src={image} className="max-h-[450px]" alt="Preview" />
                <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
                  {Array.from({ length: columns * rows }).map((_, i) => <div key={i} className="border border-blue-500/20"></div>)}
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-300">
                <ImageIcon size={64} className="mx-auto mb-2 opacity-20" />
                <p>等待素材上傳...</p>
              </div>
            )}
          </div>
        </div>

        {/* 結果區 */}
        {processedStickers.length > 0 && (
          <div className="mt-8 bg-white p-8 rounded-3xl shadow-lg border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">裁切結果</h3>
              <button onClick={downloadZip} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-colors">
                <Download size={20} /> 打包下載 ZIP
              </button>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
              {processedStickers.map((s, i) => (
                <div key={i} className="border-2 border-slate-100 rounded-xl p-1 aspect-square flex items-center justify-center bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAjyQc6OUPCMQ4gGAE/i/DyoUAAAAASUVORK5CYII=')]">
                  <img src={s.src} className="max-h-full max-w-full" alt="Sticker" />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="p-10 text-center text-slate-400 text-sm">
        © 2026 星策創新 Great Spark Innovation.
      </footer>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}