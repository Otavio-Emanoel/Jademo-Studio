// ============= Elementos DOM =============
const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('output');
const canvasCtx = canvasElement.getContext('2d');
const filterButtons = document.querySelectorAll('.filter-btn');
const filterButtonsContainer = document.querySelector('.effects-container');
const dogImage = document.getElementById('dogFilter');

// ============= Estados da Aplicação =============
let isDown = false;
let startX;
let scrollLeft;
let faceMesh = null;
let isUsingDogFilter = false;

// ============= Configuração da Câmera =============
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: 1280,
                height: 720,
                facingMode: 'user'
            },
            audio: false
        });
        videoElement.srcObject = stream;
    } catch (error) {
        console.error('Erro ao acessar a câmera:', error);
    }
}

// ============= Captura de Fotos =============
function capturePhoto() {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = videoElement.clientWidth;
    tempCanvas.height = videoElement.clientHeight;

    if (isUsingDogFilter && canvasElement.style.display !== 'none') {
        tempCtx.drawImage(canvasElement, 0, 0, tempCanvas.width, tempCanvas.height);
    } else {
        tempCtx.filter = getComputedStyle(videoElement).filter;
        tempCtx.scale(-1, 1);
        tempCtx.translate(-tempCanvas.width, 0);
        tempCtx.drawImage(videoElement, 0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.setTransform(1, 0, 0, 1, 0, 0);
    }

    tempCanvas.toBlob(function (blob) {
        // Salvar na pasta pública de imagens para aparecer na galeria
        let dir;
        if (window.cordova.platformId === 'android') {
            dir = cordova.file.externalRootDirectory + 'Pictures/';
        } else {
            dir = cordova.file.dataDirectory;
        }

        window.resolveLocalFileSystemURL(dir, function (dirEntry) {
            const fileName = `foto_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
            dirEntry.getFile(fileName, { create: true, exclusive: false }, function (fileEntry) {
                fileEntry.createWriter(function (fileWriter) {
                    fileWriter.onwriteend = function () {
                        createFlashEffect();
                        if (window.plugins && window.plugins.toast) {
                            window.plugins.toast.showWithOptions({
                                message: "Foto salva na galeria!",
                                duration: "short",
                                position: "bottom"
                            });
                        } else {
                            navigator.notification.alert(
                                'Foto salva em: ' + fileEntry.nativeURL,
                                null,
                                'Sucesso',
                                'OK'
                            );
                        }
                    };
                    fileWriter.onerror = function (e) {
                        navigator.notification.alert(
                            'Erro ao salvar foto: ' + e.toString(),
                            null,
                            'Erro',
                            'OK'
                        );
                    };
                    fileWriter.write(blob);
                }, function (err) {
                    navigator.notification.alert(
                        'Erro ao criar writer: ' + err.toString(),
                        null,
                        'Erro',
                        'OK'
                    );
                });
            }, function (err) {
                navigator.notification.alert(
                    'Erro ao criar arquivo: ' + err.toString(),
                    null,
                    'Erro',
                    'OK'
                );
            });
        }, function (err) {
            navigator.notification.alert(
                'Erro ao acessar diretório: ' + err.toString(),
                null,
                'Erro',
                'OK'
            );
        });
    }, 'image/png');
}

function createFlashEffect() {
    // Cria um elemento para o efeito de flash
    const flash = document.createElement('div');
    flash.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: white;
        opacity: 0;
        z-index: 9999;
        pointer-events: none;
        animation: flash 0.5s ease-out;
    `;

    // Adiciona a animação ao CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes flash {
            0% { opacity: 0; }
            50% { opacity: 0.8; }
            100% { opacity: 0; }
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(flash);

    // Remove o flash após a animação
    setTimeout(() => {
        document.body.removeChild(flash);
        document.head.removeChild(style);
    }, 500);
}

// ============= Controle de Filtros =============
function applyFilter(filterName) {
    // Lista completa de todos os filtros
    const allFilters = [
        'filter-normal',
        'filter-grayscale',
        'filter-sepia',
        'filter-saturate',
        'filter-contrast',
        'filter-blur',
        'filter-vintage',
        'filter-dramatic',
        'filter-aesthetic',
        'filter-cinema',
        'filter-retro',
        'filter-dark'
    ];

    // Remove todos os filtros anteriores
    videoElement.classList.remove(...allFilters);

    // Remove classe active de todos os botões
    filterButtons.forEach(btn => btn.classList.remove('active'));

    if (filterName === 'dog') {
        isUsingDogFilter = true;
        canvasElement.style.display = 'block';
        initFaceMesh(); // Inicializa o Face Mesh
    } else {
        isUsingDogFilter = false;
        canvasElement.style.display = 'none';
        if (filterName !== 'normal') {
            videoElement.classList.add(`filter-${filterName}`);
        }
        // Se não estiver usando dog, garanta que a câmera está ativa
        startCamera();
    }

    // Ativa o botão selecionado
    const activeButton = document.querySelector(`[data-filter="${filterName}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

// ============= MediaPipe Face Mesh =============
async function initFaceMesh() {
    if (!faceMesh) {
        faceMesh = new FaceMesh({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            }
        });

        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        faceMesh.onResults(onResults);

        // Verifica se Camera está disponível
        if (typeof window.Camera !== "function") {
            navigator.notification.alert(
                "Erro: Biblioteca MediaPipe Camera não carregada corretamente.",
                null,
                "Erro",
                "OK"
            );
            return;
        }

        const mediaPipeCamera = new window.Camera(videoElement, {
            onFrame: async () => {
                if (isUsingDogFilter) {
                    await faceMesh.send({ image: videoElement });
                }
            },
            width: 1280,
            height: 720
        });

        await mediaPipeCamera.start();
    }

    // Garante que o vídeo e o canvas estejam configurados corretamente
    videoElement.style.display = 'block';
    canvasElement.style.display = 'block';
    canvasElement.width = videoElement.clientWidth;
    canvasElement.height = videoElement.clientHeight;
}

function onResults(results) {
    if (!isUsingDogFilter) return;

    canvasElement.width = videoElement.clientWidth;
    canvasElement.height = videoElement.clientHeight;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Desenha o vídeo espelhado
    canvasCtx.scale(-1, 1);
    canvasCtx.translate(-canvasElement.width, 0);
    canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.restore();

    if (results.multiFaceLandmarks) {
        for (const landmarks of results.multiFaceLandmarks) {
            const nose = landmarks[5];
            const leftEye = landmarks[159];
            const rightEye = landmarks[386];

            const eyeDistance = Math.sqrt(
                Math.pow(rightEye.x - leftEye.x, 2) +
                Math.pow(rightEye.y - leftEye.y, 2)
            );

            // Ajuste o tamanho do filtro
            const filterWidth = canvasElement.width * eyeDistance * 2.55;
            const filterHeight = filterWidth * (dogImage.height / dogImage.width);

            // Calcula a posição considerando o espelhamento
            const x = canvasElement.width - (nose.x * canvasElement.width) - filterWidth / 2;
            const y = nose.y * canvasElement.height - filterHeight / 1.25;

            // Calcula o ângulo (corrigido para orientação correta)
            const deltaY = leftEye.y - rightEye.y;
            const deltaX = leftEye.x - rightEye.x;
            const angle = Math.atan2(deltaY, deltaX);

            // Aplica transformações para o filtro
            canvasCtx.save();
            canvasCtx.translate(x + filterWidth / 2, y + filterHeight / 2);
            canvasCtx.rotate(-angle);
            canvasCtx.scale(1, -1);
            canvasCtx.drawImage(
                dogImage,
                -filterWidth / 2,
                -filterHeight / 2,
                filterWidth,
                filterHeight
            );
            canvasCtx.restore();
        }
    }
}

// ============= Event Listeners =============

// Botão de captura
document.getElementById('capture-btn').addEventListener('click', function (event) {
    event.preventDefault();
    capturePhoto();
});

// Botões de filtro
filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        const filterName = button.getAttribute('data-filter');
        applyFilter(filterName);
    });
});

// ============= Inicialização =============
applyFilter('normal');

if (!isUsingDogFilter) {
    startCamera();
}