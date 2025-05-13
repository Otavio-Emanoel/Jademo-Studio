function openFilePicker() {
    var srcType = Camera.PictureSourceType.SAVEDPHOTOALBUM;

    var options = {
        quality: 50,
        destinationType: Camera.DestinationType.FILE_URI,
        sourceType: srcType,
        encodingType: Camera.EncodingType.JPEG,
        mediaType: Camera.MediaType.PICTURE,
        allowEdit: false,
        correctOrientation: true
    };

    navigator.camera.getPicture(function cameraSuccess(imageUri) {
        console.log("Imagem URI:", imageUri);

        var imgElement = document.querySelector(".img-file");
        if (imgElement) {
            imgElement.src = imageUri;
        }

    }, function cameraError(error) {
        console.error("Erro ao obter imagem: " + error);
    }, options);
}


openFilePicker();
