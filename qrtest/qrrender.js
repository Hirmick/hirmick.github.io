function Point(x,y) {
    this.x = x;
    this.y = y;
}

function qrCode(size,value) {
    var array = new Array(size);
    for(var j=0;j<size;++j) {
        var row = new Array(size);
        for(var i=0;i<size;++i) {
            if(value===null) row[i] = Math.random()<0.5; else row[i] = value;
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

// dir: 0=right,1=down,2=left,3=up
/* Erzeugt einen Pfad beginnend bei Gitterpunkt (x,y) in Richtung <dir>, der einen
 * schwarzen Bereich math. negativ umläuft. Alle vertikalen Kanten werden im
 * 2D-Array <vEdges> mit <true> markiert.
 *
 * Bemerkung: Der Pfad selbst ist nicht notwendigerweise im Uhrzeigersinn. Aufgefasst
 *   als Rand des schwarzen Bereiches ist er aber stets mathematisch negativ orientiert
 *   (also Uhrzeigersinn). Wenn er ein "Loch" beschreibt, ist er für sich allein
 *   genommen gegen den Uhrzeigersinn orientiert.
 * 
 * Beim Aufruf folgendes beachten:
 *  (1) <dir> muss bereits in die richtige Richtung zeigen, d.h. es muss gelten:
 *        a) Das Modul in Fahrtrichtung links muss weiß sein oder außerhalb des Rasters
 *        b) Das Modul in Fahrtrichtung rechts muss schwarz sein
 *      ["Fahrtrichtung" ist <dir>]. Grund ist, dass in Fahrtrichtung rechts das
 *      Innere und links das Äußere des Pfades liegt
 *  (2) Der Pfad darf (x,y) nicht vorzeitig erreichen. Äquivalent dazu ist, dass
 *      bei dem Gitterpunkt (x,y) nicht alle vier Kanten gleichzeitig zu dem gesuchten
 *      Pfad gehören. Ein hinreichendes Kriterium dafür ist: x oder y sei minimal oder
 *      maximal.Wir könnten auf diese Einschränkung verzichten, indem wir das Abbruch-
 *      kriterium ersetzen durch "x==x0 && y==y0 && dir==dir0". Wir haben darauf
 *      verzichtet, da wir diese Einschränkung automatisch einhalten.
 *  (3) (x,y) sollte ein Eckpunkt des Pfades sein. Wenn diese Bedingung verletzt ist,
 *      ist der resultierende Pfad nicht optimal in dem Sinne, dass (x,y) explizit
 *      im Pfad auftaucht, obwohl es kein Eckpunkt ist.
 *
 * Wir rufen die Funktion innerhalb von "draw" auf. Dort rastern wir zeilenweise jeweils
 * von links nach rechts ab und beginnen daher jeden Pfad mit seiner ersten oberen linken
 * Ecke. Damit sind die letzten beiden Bedingungen automatisch erfüllt. Die erste
 * Bedingung erfüllen wir dadurch, dass wir als Richtung stets 0 (rechts) oder 1 (unten)
 * übergeben, was bei einem Eckpunkt oben links immer richtig ist. "rechts" führt zu
 * Pfaden im Uhrzeigersinn, beschreibt also einen Pfad mit Inhalt. "unten" führt dagegen
 * zu Pfaden gegen den Uhrzeigersinn und beschreiben damit "Löcher".
 */
function createPath(code,vEdges,x,y,dir) {
    var x0 = x;
    var y0 = y;
    
    var size = code.length;
    
    function ok(i,j) {
        return i>=0 && j>=0 && i<size && j<size && code[j][i];
    }
    
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
    } while(x != x0 || y != y0);
    
    return path;
}

function renderPath(ctx,width,height,size,path) {
    var scaleX = (width-100)/size;
    var scaleY = (height-100)/size;

    ctx.moveTo(50+path[0].x*scaleX,50+path[0].y*scaleY);
    for(var i=1;i<path.length-1;++i) ctx.lineTo(50+path[i].x*scaleX,50+path[i].y*scaleY);
    ctx.closePath();
}

function draw(code) {
    var size = code.length
    var vEdges = create2dBoolArray(code.length+1,code.length);

    var canvas = document.getElementById("canvas");
    var ctx = canvas.getContext("2d");
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "rgb(102, 204, 0)";
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgb(0, 50, 200)";

    var count = 0;
    for(var j=0;j<size;++j) {
        var inside = false;
        for(var i=0;i<size;++i) {
            var c = code[j][i];
            if(inside != c) {
                // Vertikale Kante gefunden
                inside = !inside;
                
                // Wenn die Kante neu ist, Pfad hinzufügen
                if( !vEdges[j][i] ) {
                    var path = createPath(code,vEdges,i,j,inside?0:1);
                    if(!count) ctx.beginPath();
                    renderPath(ctx,500,500,size,path);
                    ++count;
                }
            }
        }
    }
    
    if(count>0) {
        ctx.fill();
        ctx.stroke();
    }
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
