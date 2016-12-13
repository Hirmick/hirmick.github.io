function Point(x,y) {
    this.x = x;
    this.y = y;
}

function qrCode(size,value) {
    if(value!=null && value.isDark) size = value.getModuleCount();

    var array = new Array(size);
    for(var j=0;j<size;++j) {
        var row = new Array(size);
        for(var i=0;i<size;++i) {
            if(value===null) {
                row[i] = Math.random()<0.5;
            } else if(value.isDark) {
                row[i] = value.isDark(j,i);
            } else {
                row[i] = value;
            }
        }
        array[j] = row;
    }
    
    return array;
}

function create2dBoolArray(width,height) {
    var array = new Array(height);
    for(var j=0;j<height;++j) {
        var row = new Array(width);
        for(var i=0;i<width;++i) row[i] = false;
        array[j] = row;
    }
    return array;
}

/* Erzeugt einen Pfad beginnend bei Gitterpunkt (x,y), der einen schwarzen Bereich math.
 * negativ umläuft. Alle vertikalen Kanten werden im 2D-Array <vEdges> mit <true> markiert.
 *
 * Bemerkung: Der Pfad selbst ist nicht notwendigerweise im Uhrzeigersinn. Schwarze
 *   Bereiche sind mathematisch negativ orientiert und der Pfad bekommt - als Rand
 *   aufgefasst - die induzierte Orientierung. Je nachdem, ob der schwarze Bereich innen
 *   oder außen vom Pfad liegt, ist dieser im oder gegen den Uhrzeigersinn orientiert.
 * 
 * Einschränkung:
 *   Der Gitterpunkt (x,y) muss eine obere Ecke sein. Das ist äquivalent dazu, dass
 *   durch (x,y) eine Kante nach unten sowie eine Kante nach rechts geht.
 * 
 * Wir rufen die Funktion innerhalb von "outline" auf. Dort rastern wir zeilenweise jeweils
 * von links nach rechts ab und beginnen daher jeden Pfad mit seiner ersten oberen linken
 * Ecke. Die Bedingung ist also trivialerweise erfüllt.
 */
function createPath(code,vEdges,x,y) {
    var x0 = x;
    var y0 = y;
    
    var size = code.length;
    
    function ok(i,j) {
        return i>=0 && j>=0 && i<size && j<size && code[j][i];
    }
    
    var hole = !ok(x,y); // beschreibt der Pfad ein Loch ?
    if(ok(x-1,y)!=ok(x,y-1) || ok(x,y-1)!=hole) {
        throw "Invalid arguments: Keine obere linke Ecke";
    }
    
    // dir: 0=right,1=down,2=left,3=up
    var dir = hole?1:0; // Bei Löchern nach unten, sonst nach rechts
    var dir0 = dir;

    var path = [new Point(x,y)];
    var __dx = [1,0,-1,0];
    var __dy = [0,1,0,-1];

    do {
        // Richtungvektor bestimmen und ggf vertikale Kante markieren
        var dx = __dx[dir];
        var dy = __dy[dir];
        if(dy<0) vEdges[y-1][x] = true;
        if(dy>0) vEdges[y][x] = true;
        // Einen Schritt bewegen
        x += dx;
        y += dy;
        // Modul bestimmen (Fahrtrichtung rechts)
        var i = x+(dx-dy-1)/2;
        var j = y+(dx+dy-1)/2;
        // Ggf abbiegen
        if(!ok(i,j)) {
            dir = (dir+1)&3; // Im Uhrzeigersinn drehen
        } else if(ok(i+dy,j-dx)) {
            dir = (dir+3)&3; // Gegen den Uhrzeigersinn drehen
        } else continue; // Kein Knick --> Pfad muss noch nicht angepasst werden
        // Pfad anpassen
        path.push(new Point(x,y));
    } while(x != x0 || y != y0 || dir!=dir0);
    
    return path;
}

function renderCanvas(ctx,width,height,size,pathArray) {
    if(pathArray.length==0) return;
    
    var scaleX = (width-100)/size;
    var scaleY = (height-100)/size;

    ctx.beginPath();
    for(var pid=0;pid<pathArray.length;++pid) {
        var path = pathArray[pid];
        ctx.moveTo(50+path[0].x*scaleX,50+path[0].y*scaleY);
        for(var i=1;i<path.length-1;++i) ctx.lineTo(50+path[i].x*scaleX,50+path[i].y*scaleY);
        ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
}

function renderPDF(doc,x,y,width,height,size,pathArray) {
    if(pathArray.length==0) return;
    
    var scaleX = width/size;
    var scaleY = height/size;

    for(var pid=0;pid<pathArray.length;++pid) {
        var path = pathArray[pid];
        doc.moveTo(x+path[0].x*scaleX,y+path[0].y*scaleY);
        for(var i=1;i<path.length-1;++i) doc.lineTo(x+path[i].x*scaleX,y+path[i].y*scaleY);
    }
    doc.fill();
}

function outline(code) {
    var size = code.length
    var vEdges = create2dBoolArray(code.length+1,code.length);

    result = [];

    for(var j=0;j<size;++j) {
        var inside = false;
        for(var i=0;i<size;++i) {
            var c = code[j][i];
            if(inside != c) {
                // Vertikale Kante gefunden
                inside = !inside;
                
                // Wenn die Kante neu ist, Pfad hinzufügen
                if( !vEdges[j][i] ) result.push(createPath(code,vEdges,i,j));
            }
        }
    }
    
    return result;
}

function draw(code) {
    var pathArray = outline(code);

    var canvas = document.getElementById("canvas");
    var ctx = canvas.getContext("2d");
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "rgb(102, 204, 0)";
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgb(0, 50, 200)";
    
    renderCanvas(ctx,canvas.width,canvas.height,code.length,pathArray);
}

code = null;

function setup() {
    var canvas = document.getElementById("canvas");
    canvas.onmousedown = canvasMouseDown;
    main(null);
}

function main(value) {
    code = qrCode(20,value);
    
    draw(code);
}

function qrMain() {
    var text = document.getElementById("textinput").value;
    
    try {
       var qr = qrcode(1,'L');
       qr.addData(text);
       qr.make();
    } catch(err) {
        alert("Fehler beim Erstellen des QR-Codes. Vermutlich ist der Eingabetext zu lang oder falsch kodiert");
        return;
    }
    
    main(qr);
}

function canvasMouseDown(ev) {
    var x = ev.clientX-ev.target.offsetLeft;
    var y = ev.clientY-ev.target.offsetTop;
    
    var scaleX = (canvas.width-100)/code.length;
    var scaleY = (canvas.height-100)/code.length;
    x = Math.floor((x-50)/scaleX);
    y = Math.floor((y-50)/scaleY);
    
    if(x<0 || y<0 || x>=code.length || y>=code.length) return;
    
    code[y][x] = !code[y][x];
    draw(code);
}

function makePdf() {
    var doc = new PDFDocument();
    
    var pathArray = outline(code);
    renderPDF(doc,100,100,28,28,code.length,pathArray);
    
    var stream = doc.pipe(blobStream());
    
    doc.end();
    stream.on('finish',function() {
        var blob = stream.toBlob("application/pdf");
        var reader = new window.FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = function() {
            window.open(reader.result);
        }
    });
}
