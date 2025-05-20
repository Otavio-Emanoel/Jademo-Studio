document.addEventListener('deviceready', function () {
    var imgElement = document.querySelector('.img-file');
    if (imgElement) {
        imgElement.style.cursor = 'pointer';
        imgElement.addEventListener('click', function () {
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
                // Tenta converter para DataURL usando o plugin File
                window.resolveLocalFileSystemURL(imageUri, function (fileEntry) {
                    fileEntry.file(function (file) {
                        var reader = new FileReader();
                        reader.onloadend = function () {
                            imgElement.src = this.result; // DataURL
                        };
                        reader.readAsDataURL(file);
                    }, function (err) {
                        // Se falhar, tenta exibir o caminho direto (pode não funcionar no Debugger)
                        imgElement.src = imageUri;
                    });
                }, function (err) {
                    imgElement.src = imageUri;
                });
            }, function (error) {
                console.error("Erro ao selecionar imagem: " + error);
            }, options);
        });
    }
});