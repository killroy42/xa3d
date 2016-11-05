importScripts('wfc.js');

onmessage = function(e) {
    postMessage({type:'message', message: '> Initiated the WebWorker'});

    var tries = 0;
    var instance = new wfc.OverlappingModel(new Uint8Array(e.data.sampleData), e.data.sampleWidth, e.data.sampleHeight, e.data.n, e.data.width, e.data.height, e.data.periodicInput, e.data.periodic, e.data.symmetry, e.data.ground);

    postMessage({type:'message', message: '> Instanciated OverlappingModel'});

    var finished = false;
    var time;

    do {
        tries++;
        postMessage({type:'message', message: '> Generation attempt #' + tries + ' out of 5'});
        time = Date.now();
        finished = instance.generate();
        postMessage({type:'message', message: '> Generation completed ' + (finished ? 'successfully' : 'unsuccessfully') + ' in ' + ((Date.now() - time) / 1000).toFixed(3) + 's'});
    } while (tries < 5 && !finished);


    var messageObject = {
        type: 'data',
        data: finished ? instance.graphics(new Uint8Array(e.data.generateData)).buffer : e.data.generateData,
        finished: finished
    };

    postMessage(messageObject, [messageObject.data]);
};
