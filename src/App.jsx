import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Image as ImageIcon, Settings, Scissors } from 'lucide-react';
import JSZip from 'jszip'; // 【關鍵】直接從套件引入

export default function App() {
  const [image, setImage] = useState(null);
  const [originalImageObj, setOriginalImageObj] = useState(null);
  const [columns, setColumns] = useState(4);
  const [rows, setRows] = useState(3);
  const [tolerance, setTolerance] = useState(30);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedStickers, setProcessedStickers] = useState([]);

  const canvasRef = useRef(null);

  // 只保留 Tailwind CDN 的保險，移除 JSZip 的動態載入
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(script);
    }
  }, []);

  const handleImageUpload = (e) => {
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
  };

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

  const downloadZip = async () => {
    try {
      // 使用 import 進來的 JSZip 類別
      const zip = new JSZip(); 
      const folder = zip.folder("stickers");
      
      processedStickers.forEach((s, i) => {
        folder.file(`sticker_${i+1}.png`, s.src.split(',')[1], {base64: true});
      });

      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(content);
      a.download = "Great_Spark_Stickers.zip";
      document.body.appendChild(a); // 部分手機瀏覽器需要加入 DOM 才能觸發
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error("ZIP Error:", error);
      alert("打包失敗，請重試");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <header style={{ backgroundColor: '#131e2c', padding: '40px 20px' }} className="text-white shadow-xl text-center">
        <div className="max-w-6xl mx-auto">
          <img src="/logo.png" alt="Logo" style={{ height: '50px', width: 'auto', margin: '0 auto 16px' }} />
          <h1 style={{ color: '#ffffff' }} className="text-2xl md:text-4xl font-black flex items-center justify-center gap-3">
            <Scissors className="text-blue-400" /> LINE 貼圖製作神器
          </h1>
          <p className="text-slate-400 mt-2">星策創新 Great Spark 技術支持</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden grid grid-cols-1 lg:grid-cols-2">
          <div className="p-8 border-b lg:border-r border-slate-100 space-y-6">
            <div className="border-3 border-dashed rounded-2xl p-10 text-center bg-slate-50">
              <input type="file" onChange={handleImageUpload} className="hidden" id="upload" />
              <label htmlFor="upload" className="cursor-pointer">
                <Upload className="mx-auto w-12 h-12 mb-3 text-slate-300" />
                <span className="text-slate-700 font-bold block">{image ? "更換圖片" : "點擊上傳圖片"}</span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input type="number" value={columns} onChange={e => setColumns(e.target.value)} className="p-3 rounded-xl border-2 border-slate-100" />
              <input type="number" value={rows} onChange={e => setRows(e.target.value)} className="p-3 rounded-xl border-2 border-slate-100" />
            </div>
            <button onClick={processStickers} disabled={!image || isProcessing} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg">
              {isProcessing ? "處理中..." : "開始製作"}
            </button>
          </div>
          <div className="p-8 bg-slate-50 flex items-center justify-center">
            {image ? <img src={image} className="max-h-[400px] shadow-2xl" alt="Preview" /> : <p className="text-slate-300">等待素材...</p>}
          </div>
        </div>

        {processedStickers.length > 0 && (
          <div className="mt-8 bg-white p-8 rounded-3xl shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">裁切結果</h3>
              <button onClick={downloadZip} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                <Download size={20} /> 打包下載 ZIP
              </button>
            </div>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
              {processedStickers.map((s, i) => (
                <div key={i} className="border rounded-xl p-1 aspect-square flex items-center justify-center bg-slate-50">
                  <img src={s.src} className="max-h-full" alt="Sticker" />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}