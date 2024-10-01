// 获取DOM元素
const imageUpload = document.getElementById('image-upload');
const uploadBtn = document.getElementById('upload-btn');
const previewSection = document.getElementById('preview-section');

// 存储上传的图片
let uploadedImages = [];

// 上传按钮点击事件
uploadBtn.addEventListener('click', () => {
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        // 对于iOS设备，直接触发点击事件
        imageUpload.click();
    } else {
        // 对于其他设备，保持原有行为
        imageUpload.click();
    }
});

// 添加触摸事件监听
uploadBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    imageUpload.click();
});

// 处理图片上传
imageUpload.addEventListener('change', (event) => {
    console.log('File input change event triggered');
    addDebugInfo('File input change event triggered');
    const files = event.target.files;
    if (files && files.length > 0) {
        console.log(`Selected ${files.length} files`);
        addDebugInfo(`Selected ${files.length} files`);
        handleFiles(files);
    } else {
        console.log('No files selected');
        addDebugInfo('No files selected');
    }
});

// 处理文件函数
function handleFiles(files) {
    uploadedImages = Array.from(files);
    
    // 清空预览区域
    previewSection.innerHTML = '';
    
    // 显示上传的图片预览
    uploadedImages.forEach((image, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = `Uploaded Image ${index + 1}`;
            img.classList.add('preview-image');
            previewSection.appendChild(img);
        };
        reader.readAsDataURL(image);
    });
}

// 添加拖放支持
previewSection.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
});

previewSection.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    handleFiles(files);
});

// 获取合成按钮
const mergeBtn = document.getElementById('merge-btn');

// 合成按钮点击事件
mergeBtn.addEventListener('click', async () => {
    const mergeType = parseInt(document.getElementById('merge-type').value);
    const interval = parseInt(document.getElementById('interval').value);
    const spacing = parseInt(document.getElementById('spacing').value);
    
    // 检查是否有足够的图片
    if (uploadedImages.length < mergeType) {
        alert('上传的图片数量不足，无法完成合成');
        return;
    }
    
    // 清空预览区域
    previewSection.innerHTML = '';
    
    // 计算可以合成的组数
    const groupCount = Math.floor(uploadedImages.length / (mergeType * interval));
    
    // 使用Promise来确保所有图片都加载完成
    const loadImages = async (imagesToLoad) => {
        const loadedImages = [];
        for (const imageToLoad of imagesToLoad) {
            const img = await createImage(URL.createObjectURL(imageToLoad));
            loadedImages.push(img);
        }
        return loadedImages;
    };

    const createImage = (src) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    };

    try {
        for (let group = 0; group < groupCount; group++) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const imageSize = 300; // 假设每张图片的大小为300x300
            canvas.width = mergeType === 2 ? imageSize * 2 + spacing : imageSize * 2 + spacing;
            canvas.height = mergeType === 2 ? imageSize : imageSize * 2 + spacing;
            
            const imagesToMerge = uploadedImages.slice(group * mergeType * interval, (group + 1) * mergeType * interval);
            
            const loadedImages = await loadImages(imagesToMerge);
            
            loadedImages.forEach((img, i) => {
                const x = (i % 2) * (imageSize + spacing);
                const y = Math.floor(i / 2) * (imageSize + spacing);
                ctx.drawImage(img, x, y, imageSize, imageSize);
            });
            
            // 显示合成结果
            const mergedImage = document.createElement('img');
            mergedImage.src = canvas.toDataURL('image/png');
            mergedImage.alt = `Merged Image ${group + 1}`;
            mergedImage.classList.add('merged-image');
            previewSection.appendChild(mergedImage);
        }
    } catch (error) {
        console.error('Error merging images:', error);
        alert('合成图片时出错，请重试');
    }
});

// 获取下载按钮
const downloadBtn = document.getElementById('download-btn');

// 下载按钮点击事件
downloadBtn.addEventListener('click', () => {
    const mergedImages = document.querySelectorAll('.merged-image');
    if (mergedImages.length === 0) {
        alert('请先合成图片');
        return;
    }
    
    mergedImages.forEach((mergedImage, index) => {
        const link = document.createElement('a');
        link.href = mergedImage.src;
        link.download = `merged_image_${index + 1}.png`;
        link.click();
    });
});

// 获取导出按钮
const exportExcelBtn = document.getElementById('export-excel-btn');
const exportPdfBtn = document.getElementById('export-pdf-btn');

// 导出Excel按钮点击事件
exportExcelBtn.addEventListener('click', async () => {
    const mergedImages = document.querySelectorAll('.merged-image');
    if (mergedImages.length === 0) {
        alert('请先合成图片');
        return;
    }
    
    try {
        console.log('开始导出Excel...');
        
        // 创建新的工作簿
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('合成图片');
        
        // 设置列宽
        worksheet.columns = [
            { header: '序号', key: 'id', width: 10 },
            { header: '图片', key: 'image', width: 50 }
        ];
        
        // 添加图片到工作表
        for (let i = 0; i < mergedImages.length; i++) {
            const row = worksheet.addRow({ id: i + 1 });
            
            // 将图片数据转换为 ArrayBuffer
            const response = await fetch(mergedImages[i].src);
            const imageArrayBuffer = await response.arrayBuffer();
            
            const imageId = workbook.addImage({
                buffer: imageArrayBuffer,
                extension: 'png',
            });
            
            worksheet.addImage(imageId, {
                tl: { col: 1, row: row.number - 1 },
                ext: { width: 200, height: 200 }
            });
            
            // 调整行高以适应图片
            row.height = 150;
        }
        
        console.log('开始写入文件...');
        // 生成 Excel 文件并下载
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'merged_images.xlsx';
        link.click();
        console.log('Excel文件导出成功');
    } catch (error) {
        console.error('导出Excel时发生错误:', error);
        alert('导出Excel失败，请查看控制台以获取详细信息');
    }
});

// 导出PDF按钮点击事件
exportPdfBtn.addEventListener('click', () => {
    const mergedImages = document.querySelectorAll('.merged-image');
    if (mergedImages.length === 0) {
        alert('请先合成图片');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    
    mergedImages.forEach((mergedImage, index) => {
        if (index > 0) {
            pdf.addPage();
        }
        pdf.addImage(mergedImage.src, 'PNG', 10, 10, 190, 190);
    });
    
    pdf.save('merged_images.pdf');
});

// 添加触摸事件支持
document.addEventListener('touchstart', handleTouchStart, false);
document.addEventListener('touchmove', handleTouchMove, false);

let xDown = null;
let yDown = null;

function handleTouchStart(evt) {
    const firstTouch = evt.touches[0];
    xDown = firstTouch.clientX;
    yDown = firstTouch.clientY;
}

function handleTouchMove(evt) {
    if (!xDown || !yDown) {
        return;
    }

    const xUp = evt.touches[0].clientX;
    const yUp = evt.touches[0].clientY;

    const xDiff = xDown - xUp;
    const yDiff = yDown - yUp;

    if (Math.abs(xDiff) > Math.abs(yDiff)) {
        if (xDiff > 0) {
            /* 左滑动 */
        } else {
            /* 右滑动 */
        }
    } else {
        if (yDiff > 0) {
            /* 上滑动 */
        } else {
            /* 下滑动 */
        }
    }

    xDown = null;
    yDown = null;
}