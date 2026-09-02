import { showStatus } from "./status.js";
import { formatFileSize } from "./url-parser.js";

const invoke = window.__TAURI_INTERNALS__?.invoke;

export function initImageResizer() {
  const imageFileInput = document.querySelector("#imageFileInput");
  const selectImageBtn = document.querySelector("#selectImageBtn");
  const convertToPngBtn = document.querySelector("#convertToPngBtn");
  const removeBackgroundBtn = document.querySelector("#removeBackgroundBtn");
  const downloadResizedBtn = document.querySelector("#downloadResizedBtn");
  const clearImageBtn = document.querySelector("#clearImageBtn");
  const applyResizeBtn = document.querySelector("#applyResizeBtn");
  const resizeMode = document.querySelector("#resizeMode");
  const resizePercentage = document.querySelector("#resizePercentage");
  const percentageValue = document.querySelector("#percentageValue");
  const percentageControls = document.querySelector("#percentageControls");
  const dimensionControls = document.querySelector("#dimensionControls");
  const resizeWidth = document.querySelector("#resizeWidth");
  const resizeHeight = document.querySelector("#resizeHeight");
  const maintainAspectRatio = document.querySelector("#maintainAspectRatio");
  const imageQuality = document.querySelector("#imageQuality");
  const qualityValue = document.querySelector("#qualityValue");
  const outputFormat = document.querySelector("#outputFormat");
  const originalImagePreview = document.querySelector("#originalImagePreview");
  const resizedImagePreview = document.querySelector("#resizedImagePreview");
  const originalImageInfo = document.querySelector("#originalImageInfo");
  const resizedImageInfo = document.querySelector("#resizedImageInfo");
  const bgTolerance = document.querySelector("#bgTolerance");
  const toleranceValue = document.querySelector("#toleranceValue");

  let originalImage = null;
  let originalImageData = null;
  let resizedImageData = null;
  let isRemovingBackground = false;

  function handleSelectImage() {
    imageFileInput?.click();
  }

  function handleImageSelected(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showStatus("Please select a valid image file", true);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        originalImage = img;
        originalImageData = e.target.result;

        if (originalImagePreview) {
          originalImagePreview.classList.add("has-image");
          originalImagePreview.replaceChildren();

          const contentDiv = document.createElement("div");
          contentDiv.className = "image-preview-content";
          const imgEl = document.createElement("img");
          imgEl.src = originalImageData;
          imgEl.alt = "Original Image";
          contentDiv.appendChild(imgEl);
          originalImagePreview.appendChild(contentDiv);
        }

        if (originalImageInfo) {
          originalImageInfo.textContent = `${img.width} × ${img.height} px | ${formatFileSize(file.size)}`;
        }

        if (resizeWidth) resizeWidth.value = img.width;
        if (resizeHeight) resizeHeight.value = img.height;

        if (applyResizeBtn) applyResizeBtn.disabled = false;
        if (convertToPngBtn) convertToPngBtn.disabled = false;
        if (removeBackgroundBtn) removeBackgroundBtn.disabled = false;

        if (resizedImagePreview) {
          resizedImagePreview.classList.remove("has-image", "transparent-bg");
          resizedImagePreview.replaceChildren();
          const ph = document.createElement("div");
          ph.className = "image-placeholder";
          ph.textContent = 'Click "Apply Changes" to resize';
          resizedImagePreview.appendChild(ph);
        }

        if (resizedImageInfo) resizedImageInfo.textContent = "";
        if (downloadResizedBtn) downloadResizedBtn.disabled = true;
        resizedImageData = null;

        showStatus("Image loaded successfully!");
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function handleResizeModeChange() {
    const mode = resizeMode?.value;
    if (percentageControls)
      percentageControls.classList.toggle("hidden", mode === "dimensions");
    if (dimensionControls)
      dimensionControls.classList.toggle("hidden", mode !== "dimensions");
  }

  function handlePercentageChange() {
    if (percentageValue && resizePercentage) {
      percentageValue.textContent = `${resizePercentage.value}%`;
    }
    if (originalImage && resizeMode?.value === "percentage") {
      const scale = parseInt(resizePercentage?.value || "100", 10) / 100;
      if (resizeWidth)
        resizeWidth.value = Math.round(originalImage.width * scale);
      if (resizeHeight)
        resizeHeight.value = Math.round(originalImage.height * scale);
    }
  }

  function handleQualityChange() {
    if (qualityValue && imageQuality) {
      qualityValue.textContent = `${imageQuality.value}%`;
    }
  }

  function handleWidthChange() {
    if (
      maintainAspectRatio?.checked &&
      originalImage &&
      resizeWidth &&
      resizeHeight
    ) {
      const aspectRatio = originalImage.height / originalImage.width;
      resizeHeight.value = Math.round(
        parseInt(resizeWidth.value, 10) * aspectRatio,
      );
    }
  }

  function handleHeightChange() {
    if (
      maintainAspectRatio?.checked &&
      originalImage &&
      resizeWidth &&
      resizeHeight
    ) {
      const aspectRatio = originalImage.width / originalImage.height;
      resizeWidth.value = Math.round(
        parseInt(resizeHeight.value, 10) * aspectRatio,
      );
    }
  }

  function handleApplyResize() {
    if (!originalImage) {
      showStatus("Please select an image first", true);
      return;
    }

    let newWidth;
    let newHeight;

    if (resizeMode?.value === "percentage") {
      const scale = parseInt(resizePercentage?.value || "100", 10) / 100;
      newWidth = Math.round(originalImage.width * scale);
      newHeight = Math.round(originalImage.height * scale);
    } else if (resizeMode?.value === "dimensions") {
      newWidth = parseInt(resizeWidth?.value || "0", 10) || originalImage.width;
      newHeight =
        parseInt(resizeHeight?.value || "0", 10) || originalImage.height;
    } else {
      newWidth = originalImage.width;
      newHeight = originalImage.height;
    }

    const canvas = document.createElement("canvas");
    canvas.width = newWidth;
    canvas.height = newHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(originalImage, 0, 0, newWidth, newHeight);

    const format = outputFormat?.value || "png";
    const quality = parseInt(imageQuality?.value || "90", 10) / 100;

    let mimeType;
    switch (format) {
      case "png":
        mimeType = "image/png";
        break;
      case "webp":
        mimeType = "image/webp";
        break;
      default:
        mimeType = "image/jpeg";
    }

    resizedImageData = canvas.toDataURL(mimeType, quality);

    if (resizedImagePreview) {
      resizedImagePreview.classList.add("has-image");
      resizedImagePreview.classList.remove("transparent-bg");
      resizedImagePreview.replaceChildren();

      const contentDiv = document.createElement("div");
      contentDiv.className = "image-preview-content";
      const imgEl = document.createElement("img");
      imgEl.src = resizedImageData;
      imgEl.alt = "Resized Image";
      contentDiv.appendChild(imgEl);
      resizedImagePreview.appendChild(contentDiv);
    }

    const base64Length =
      resizedImageData.length - resizedImageData.indexOf(",") - 1;
    const approximateSize = Math.round((base64Length * 3) / 4);

    if (resizedImageInfo) {
      resizedImageInfo.textContent = `${newWidth} × ${newHeight} px | ~${formatFileSize(approximateSize)}`;
    }

    if (downloadResizedBtn) downloadResizedBtn.disabled = false;
    showStatus("Image resized successfully!");
  }

  function handleDownloadResized() {
    if (!resizedImageData) {
      showStatus("No resized image to download", true);
      return;
    }

    const format = outputFormat?.value || "png";
    const extension = format === "jpeg" ? "jpg" : format;

    const link = document.createElement("a");
    link.download = `resized-image.${extension}`;
    link.href = resizedImageData;
    link.click();

    showStatus("Image downloaded!");
  }

  function handleConvertToPng() {
    if (!originalImage) {
      showStatus("Please select an image first", true);
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(originalImage, 0, 0);

    resizedImageData = canvas.toDataURL("image/png");

    if (resizedImagePreview) {
      resizedImagePreview.classList.add("has-image");
      resizedImagePreview.classList.remove("transparent-bg");
      resizedImagePreview.replaceChildren();

      const contentDiv = document.createElement("div");
      contentDiv.className = "image-preview-content";
      const imgEl = document.createElement("img");
      imgEl.src = resizedImageData;
      imgEl.alt = "PNG Image";
      contentDiv.appendChild(imgEl);
      resizedImagePreview.appendChild(contentDiv);
    }

    const base64Length =
      resizedImageData.length - resizedImageData.indexOf(",") - 1;
    const approximateSize = Math.round((base64Length * 3) / 4);

    if (resizedImageInfo) {
      resizedImageInfo.textContent = `${originalImage.width} × ${originalImage.height} px | PNG | ~${formatFileSize(approximateSize)}`;
    }

    if (outputFormat) outputFormat.value = "png";
    if (downloadResizedBtn) downloadResizedBtn.disabled = false;
    showStatus("Image converted to PNG successfully!");
  }

  async function handleRemoveBackground() {
    if (!originalImage) {
      showStatus("Please select an image first", true);
      return;
    }

    if (isRemovingBackground) {
      showStatus("Background removal already in progress...", true);
      return;
    }

    isRemovingBackground = true;
    if (removeBackgroundBtn) {
      removeBackgroundBtn.disabled = true;
      removeBackgroundBtn.textContent = "⏳ Processing...";
    }

    if (resizedImagePreview) {
      resizedImagePreview.classList.remove("has-image", "transparent-bg");
      resizedImagePreview.replaceChildren();
      const ph = document.createElement("div");
      ph.className = "image-placeholder";
      ph.textContent = "Removing background... This may take a moment.";
      resizedImagePreview.appendChild(ph);
    }

    try {
      const tolerance = parseInt(bgTolerance?.value || "30", 10) || 30;
      const result = await invoke("remove_background", {
        imageData: originalImageData,
        tolerance,
      });

      resizedImageData = result;

      if (resizedImagePreview) {
        resizedImagePreview.classList.add("has-image", "transparent-bg");
        resizedImagePreview.replaceChildren();

        const contentDiv = document.createElement("div");
        contentDiv.className = "image-preview-content";
        const imgEl = document.createElement("img");
        imgEl.src = resizedImageData;
        imgEl.alt = "Background Removed";
        contentDiv.appendChild(imgEl);
        resizedImagePreview.appendChild(contentDiv);
      }

      const base64Length =
        resizedImageData.length - resizedImageData.indexOf(",") - 1;
      const approximateSize = Math.round((base64Length * 3) / 4);

      if (resizedImageInfo) {
        resizedImageInfo.textContent = `${originalImage.width} × ${originalImage.height} px | PNG | ~${formatFileSize(approximateSize)}`;
      }

      if (outputFormat) outputFormat.value = "png";
      if (downloadResizedBtn) downloadResizedBtn.disabled = false;
      showStatus("Background removed successfully!");
    } catch (error) {
      if (resizedImagePreview) {
        resizedImagePreview.replaceChildren();
        const ph = document.createElement("div");
        ph.className = "image-placeholder";
        ph.textContent = "Failed to remove background. Please try again.";
        resizedImagePreview.appendChild(ph);
      }
      showStatus(`Error: ${error || "Failed to remove background"}`, true);
    } finally {
      isRemovingBackground = false;
      if (removeBackgroundBtn) {
        removeBackgroundBtn.disabled = false;
        removeBackgroundBtn.textContent = "✂️ Remove Background";
      }
    }
  }

  function handleClearImage() {
    originalImage = null;
    originalImageData = null;
    resizedImageData = null;

    if (originalImagePreview) {
      originalImagePreview.classList.remove("has-image", "transparent-bg");
      originalImagePreview.replaceChildren();
      const ph = document.createElement("div");
      ph.className = "image-placeholder";
      ph.textContent = 'Click "Select Image" to load an image';
      originalImagePreview.appendChild(ph);
    }

    if (resizedImagePreview) {
      resizedImagePreview.classList.remove("has-image", "transparent-bg");
      resizedImagePreview.replaceChildren();
      const ph = document.createElement("div");
      ph.className = "image-placeholder";
      ph.textContent = "Resized image will appear here";
      resizedImagePreview.appendChild(ph);
    }

    if (originalImageInfo) originalImageInfo.textContent = "";
    if (resizedImageInfo) resizedImageInfo.textContent = "";

    if (applyResizeBtn) applyResizeBtn.disabled = true;
    if (downloadResizedBtn) downloadResizedBtn.disabled = true;
    if (convertToPngBtn) convertToPngBtn.disabled = true;
    if (removeBackgroundBtn) removeBackgroundBtn.disabled = true;

    if (resizePercentage) resizePercentage.value = "100";
    if (percentageValue) percentageValue.textContent = "100%";
    if (imageQuality) imageQuality.value = "90";
    if (qualityValue) qualityValue.textContent = "90%";
    if (bgTolerance) bgTolerance.value = "30";
    if (toleranceValue) toleranceValue.textContent = "30";
    if (resizeWidth) resizeWidth.value = "";
    if (resizeHeight) resizeHeight.value = "";
    if (imageFileInput) imageFileInput.value = "";

    showStatus("Image resizer cleared!");
  }

  selectImageBtn?.addEventListener("click", handleSelectImage);
  imageFileInput?.addEventListener("change", handleImageSelected);
  convertToPngBtn?.addEventListener("click", handleConvertToPng);
  removeBackgroundBtn?.addEventListener("click", handleRemoveBackground);
  downloadResizedBtn?.addEventListener("click", handleDownloadResized);
  clearImageBtn?.addEventListener("click", handleClearImage);
  applyResizeBtn?.addEventListener("click", handleApplyResize);
  resizeMode?.addEventListener("change", handleResizeModeChange);
  resizePercentage?.addEventListener("input", handlePercentageChange);
  imageQuality?.addEventListener("input", handleQualityChange);
  resizeWidth?.addEventListener("input", handleWidthChange);
  resizeHeight?.addEventListener("input", handleHeightChange);
  bgTolerance?.addEventListener("input", () => {
    if (toleranceValue && bgTolerance) {
      toleranceValue.textContent = bgTolerance.value;
    }
  });
}
