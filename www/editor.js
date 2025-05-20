document.addEventListener('deviceready', function () {
    const canvas = document.getElementById('edit-canvas');
    const ctx = canvas.getContext('2d');
    let drawing = false;
    let erasing = false;
    let lastX = 0, lastY = 0;
    let img = new Image();
    let imgDataURL = null;

    // Controles do pincel
    const brushColorInput = document.getElementById('brush-color');
    const brushSizeInput = document.getElementById('brush-size');
    const brushSizeValue = document.getElementById('brush-size-value');

    // Controles de brilho e escuro
    const brightnessInput = document.getElementById('brightness-range');
    const brightnessValue = document.getElementById('brightness-value');
    const darknessInput = document.getElementById('darkness-range');
    const darknessValue = document.getElementById('darkness-value');

    // Canvas auxiliar para o desenho do usuário
    const drawingCanvas = document.createElement('canvas');
    const drawingCtx = drawingCanvas.getContext('2d');

    function getTouchPos(e) {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0] || e.changedTouches[0];
        return {
            x: (touch.clientX - rect.left) * (canvas.width / rect.width),
            y: (touch.clientY - rect.top) * (canvas.height / rect.height)
        };
    }

    function resizeCanvas() {
        const temp = document.createElement('canvas');
        temp.width = drawingCanvas.width;
        temp.height = drawingCanvas.height;
        temp.getContext('2d').drawImage(drawingCanvas, 0, 0);

        canvas.width = window.innerWidth * 0.7;
        canvas.height = window.innerHeight * 0.5;
        drawingCanvas.width = canvas.width;
        drawingCanvas.height = canvas.height;

        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        drawingCtx.drawImage(temp, 0, 0, temp.width, temp.height, 0, 0, drawingCanvas.width, drawingCanvas.height);

        redrawImage();
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function redrawImage() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (imgDataURL) {
            ctx.save();
            const contrast = document.getElementById('contrast-range').value;
            const saturate = document.getElementById('saturate-range').value;
            const brightness = brightnessInput.value;
            const darkness = darknessInput.value;
            // Escuro reduz o brilho, então brightness * (1 - darkness)
            ctx.filter =
                `contrast(${contrast}) saturate(${saturate}) brightness(${brightness * (1 - darkness)})`;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            ctx.restore();
        }
        ctx.drawImage(drawingCanvas, 0, 0);
    }

    // Adiciona eventos de desenho só depois de selecionar a imagem
    function enableDrawingEvents() {
        if (canvas._drawingEventsEnabled) return;
        canvas._drawingEventsEnabled = true;

        canvas.addEventListener('touchstart', function (e) {
            e.preventDefault();
            drawing = true;
            const pos = getTouchPos(e);
            lastX = pos.x;
            lastY = pos.y;
        }, { passive: false });

        canvas.addEventListener('touchend', function (e) {
            e.preventDefault();
            drawing = false;
        }, { passive: false });

        canvas.addEventListener('touchcancel', function (e) {
            e.preventDefault();
            drawing = false;
        }, { passive: false });

        canvas.addEventListener('touchmove', function (e) {
            if (!drawing) return;
            e.preventDefault();
            const pos = getTouchPos(e);
            drawingCtx.save();
            drawingCtx.lineWidth = parseInt(brushSizeInput.value, 10);
            drawingCtx.lineCap = 'round';
            drawingCtx.strokeStyle = erasing ? '#fff' : brushColorInput.value;
            drawingCtx.globalCompositeOperation = erasing ? 'destination-out' : 'source-over';
            drawingCtx.beginPath();
            drawingCtx.moveTo(lastX, lastY);
            drawingCtx.lineTo(pos.x, pos.y);
            drawingCtx.stroke();
            drawingCtx.restore();
            lastX = pos.x;
            lastY = pos.y;
            redrawImage();
        }, { passive: false });
    }

    function selectImage() {
        var options = {
            quality: 80,
            destinationType: Camera.DestinationType.FILE_URI,
            sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
            encodingType: Camera.EncodingType.JPEG,
            mediaType: Camera.MediaType.PICTURE,
            allowEdit: false,
            correctOrientation: true
        };
        navigator.camera.getPicture(function (imageUri) {
            window.resolveLocalFileSystemURL(imageUri, function (fileEntry) {
                fileEntry.file(function (file) {
                    var reader = new FileReader();
                    reader.onloadend = function () {
                        img.onload = function () {
                            imgDataURL = img.src;
                            redrawImage();
                            enableDrawingEvents(); // Só ativa o desenho após carregar a imagem
                        };
                        img.src = this.result;
                    };
                    reader.readAsDataURL(file);
                }, function (err) {
                    console.error("Erro ao ler arquivo: ", err);
                });
            }, function (err) {
                console.error("Erro ao acessar arquivo: ", err);
            });
        }, function (error) {
            console.error("Erro ao selecionar imagem: " + error);
        }, options);
        canvas.removeEventListener('click', selectImage);
        canvas.style.cursor = 'crosshair';
        brushBtn.classList.add('active');
        eraserBtn.classList.remove('active');
        erasing = false;
    }
    canvas.style.cursor = 'pointer';
    canvas.addEventListener('click', selectImage);

    // Pincel e borracha
    const brushBtn = document.getElementById('brush-btn');
    const eraserBtn = document.getElementById('eraser-btn');

    brushBtn.addEventListener('click', function () {
        erasing = false;
        brushBtn.classList.add('active');
        eraserBtn.classList.remove('active');
        canvas.style.cursor = 'crosshair';
    });

    eraserBtn.addEventListener('click', function () {
        erasing = true;
        eraserBtn.classList.add('active');
        brushBtn.classList.remove('active');
        canvas.style.cursor = 'cell';
    });

    // Contraste, saturação, brilho e escuro
    function applyFilters() {
        document.getElementById('contrast-value').textContent = document.getElementById('contrast-range').value;
        document.getElementById('saturate-value').textContent = document.getElementById('saturate-range').value;
        brightnessValue.textContent = brightnessInput.value;
        darknessValue.textContent = darknessInput.value;
        redrawImage();
    }
    document.getElementById('contrast-range').addEventListener('input', applyFilters);
    document.getElementById('saturate-range').addEventListener('input', applyFilters);
    brightnessInput.addEventListener('input', applyFilters);
    darknessInput.addEventListener('input', applyFilters);

    // Atualiza valor do tamanho do pincel
    brushSizeInput.addEventListener('input', function () {
        brushSizeValue.textContent = brushSizeInput.value;
    });

    // Botão de download
    document.getElementById('download-btn').addEventListener('click', function () {
        redrawImage(); // Garante que tudo está atualizado

        // Para Cordova/Android (plugin cordova-plugin-file)
        if (window.cordova && window.resolveLocalFileSystemURL) {
            const dataURL = canvas.toDataURL('image/png');
            const data = dataURL.split(',')[1];
            const byteCharacters = atob(data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/png' });

            // Salva na pasta Pictures
            window.resolveLocalFileSystemURL(
                cordova.file.externalRootDirectory + 'Pictures/',
                function (dirEntry) {
                    const fileName = 'imagem-editada-' + Date.now() + '.png';
                    dirEntry.getFile(fileName, { create: true, exclusive: false }, function (fileEntry) {
                        fileEntry.createWriter(function (fileWriter) {
                            fileWriter.onwriteend = function () {
                                if (window.plugins && window.plugins.toast) {
                                    window.plugins.toast.showShortBottom('Imagem salva na galeria!');
                                } else {
                                    alert('Imagem salva na galeria!');
                                }
                            };
                            fileWriter.onerror = function (e) {
                                alert('Erro ao salvar imagem: ' + e.toString());
                            };
                            fileWriter.write(blob);
                        });
                    });
                },
                function (err) {
                    alert('Erro ao acessar diretório: ' + err.toString());
                }
            );
        } else {
            // Para web/PWA: download normal
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = 'imagem-editada.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    });

    // Modal de confirmação ao sair
    const exitModal = document.getElementById('exit-modal');
    const modalSaveBtn = document.getElementById('modal-save-btn');
    const modalExitBtn = document.getElementById('modal-exit-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    let pendingExitHref = null;

    // Intercepta o botão de voltar da navbar
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', function (e) {
            e.preventDefault();
            exitModal.classList.add('show');
            pendingExitHref = this.getAttribute('href');
        });
    }

    // Botão "Salvar" no modal
    modalSaveBtn.addEventListener('click', function () {
        exitModal.classList.remove('show');
        document.getElementById('download-btn').click();
        setTimeout(() => {
            if (pendingExitHref) window.location.href = pendingExitHref;
        }, 800); // tempo para garantir o download
    });

    // Botão "Sair sem salvar"
    modalExitBtn.addEventListener('click', function () {
        exitModal.classList.remove('show');
        if (pendingExitHref) window.location.href = pendingExitHref;
    });

    // Botão "Cancelar"
    modalCancelBtn.addEventListener('click', function () {
        exitModal.classList.remove('show');
        pendingExitHref = null;
    });

    // (Opcional) Intercepta o botão físico de voltar do Android
    document.addEventListener('backbutton', function (e) {
        e.preventDefault();
        exitModal.style.display = 'flex';
        pendingExitHref = backBtn ? backBtn.getAttribute('href') : 'index.html';
    }, false);

    document.querySelector('.tools-container').classList.add('visible');
    document.getElementById('edit-canvas').classList.add('visible');
});