var strJson = "";
var arr = [];

//Add the events for the drop zone
var dropZone = document.getElementById('dropZone');
dropZone.addEventListener('dragover', handleDragOver, false);
dropZone.addEventListener('drop', handleFileSelect, false);


function setProgBarToZero(){
    //get progress element from html and set it to 0
    var progress = document.getElementById("progress");
    progress.style.width = '0%';
    progress.textContent = '0%';
}

function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; //shows it is a copy
}

function handleFileSelect(evt) {
    evt.stopPropagation();
    evt.preventDefault();

    var files = evt.dataTransfer.files; // FileList object.

    document.getElementById('fileinput').files = files; // set new file
}







var setString = function (str){
	strJson += str;
	if(strJson.length >= 132217728){//128MB
		arr.push(strJson);
		strJson = "";
	}
}


function loadFile() {
	if (typeof window.FileReader !== 'function') {
		alert("The file API isn't supported on this browser yet.");
		return;
	}

	let input = document.getElementById('fileinput').files[0];
	//graphJ = loadJsonFile(input);
	parseFile(input, setString);
	
}

function parseString() {

	var rest = "";
	var finalarray;

	arr.push(strJson);
	arr.forEach(function (a) {
		a = rest + a;
		var first = a.indexOf("\n    \"method\" : {")-1;
		var last = a.lastIndexOf("\n    \"method\" : {")-3;

		if (finalarray == null) {finalarray = JSON.parse("{\n  \"reachableMethods\" : [ "+a.slice(first,last)+" ]\n}").reachableMethods;}
		else {Array.prototype.push.apply(finalarray,JSON.parse("{\n  \"reachableMethods\" : [ "+a.slice(first,last)+" ]\n}").reachableMethods)}

		rest = a.slice(last);


	});

	//console.log(finalarray)
   // console.log(JSON.parse("{\n  \"reachableMethods\" : [ "+rest.slice(rest.indexOf("\n    \"method\" : {")-1,-3)+" ]\n}"));
	Array.prototype.push.apply(finalarray,JSON.parse("{\n  \"reachableMethods\" : [ "+rest.slice(rest.indexOf("\n    \"method\" : {")-1,-3)+" ]\n}").reachableMethods);
	var parsedJson = {reachableMethods: finalarray};
	console.log(parsedJson);
	console.log("fertig");
	return parsedJson;

}




function parseFile(file, callback) {
	var fileSize = file.size;
	var chunkSize = 16*4*1024 * 1024; // bytes
	var offset = 0;
	var self = this; // we need a reference to the current object
	var chunkReaderBlock = null;

	var readEventHandler = function (evt) {
		if (evt.target.error == null) {
			offset += evt.target.result.length;
			callback(evt.target.result); // callback for handling read chunk
		} else {
			console.log("Read error: " + evt.target.error);
			return;
		}
		if (offset >= fileSize) {
			console.log("Done reading file");
            var parsedJson = parseString();
            changeDiv();
			(function reset(){
                strJson = "";
                arr = [];
            })();
            return parsedJson;

		}

		// of to the next chunk
		chunkReaderBlock(offset, chunkSize, file);
	}

	chunkReaderBlock = function (_offset, length, _file) {
		var r = new FileReader();
		var blob = _file.slice(_offset, length + _offset);
		r.onload = readEventHandler;
		r.readAsText(blob);
	}

	// now let's start the read with the first block
	chunkReaderBlock(offset, chunkSize, file);
}
function changeDiv() {
	$("#load_page").addClass("invis");
	$("#graph_page").removeClass( "invis" );

}