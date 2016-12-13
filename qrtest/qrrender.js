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

/* Erzeugt einen Pfad beginnend bei Gitterpunkt (x,y), der einen schwarzen Bereich math.
 * negativ umläuft. Alle vertikalen Kanten werden im 2D-Array <vEdges> mit <true> markiert.
 *
 * Bemerkung: Der Pfad selbst ist nicht notwendigerweise im Uhrzeigersinn. Schwarze
 *   Bereiche sind mathematisch negativ orientiert und der Pfad bekommt - als Rand
 *   aufgefasst - die induzierte Orientierung. Je nachdem, ob der schwarze Bereich innen
 *   oder außen vom Pfad liegt, ist dieser im oder gegen den Uhrzeigersinn orientiert.
 * 
 * Es gelten folgende Einschränkungen an (x,y):
 *   (1) Der Gitterpunkt (x,y) muss eine obere Ecke sein. Das ist äquivalent dazu, dass
 *       durch (x,y) eine Kante nach unten sowie eine Kante nach rechts geht.
 *   (2) Falls weitere Kanten durch (x,y) gehen, dürfen diese nicht zum selben Pfad
 *       gehören wie die beiden ersten, d.h. (x,y) darf kein Berührungspunkt des Pfades
 *       mit sich selbst sein. Dies ist äquivalent dazu, dass das Modul oben links von
 *       (x,y) entweder nicht existiert, weiß ist oder zu einem anderen Pfad gehört.
 * 
 * Wir rufen die Funktion innerhalb von "draw" auf. Dort rastern wir zeilenweise jeweils
 * von links nach rechts ab und beginnen daher jeden Pfad mit seiner ersten oberen linken
 * Ecke. Bedingung (1) ist also trivialerweise erfüllt. Bedingung (2) folgt, da (x,y)
 * in der ersten Zeile des Pfades liegt und über (x,y) insbesondere keine gefüllten Module
 * desselben Pfades liegen können.
 */
function createPath(code,vEdges,x,y) {
    var x0 = x;
    var y0 = y;
    
    var size = code.length;
    
    function ok(i,j) {
        return i>=0 && j>=0 && i<size && j<size && code[j][i];
    }
    
    var hole = !ok(x,y); // beschreibt der Pfad ein Loch ?
    if(ok(x-1,y)!=ok(x-1,y-1) || ok(x-1,y-1)!=ok(x,y-1) || ok(x,y-1)==hole) {
        throw "Invalid arguments: Keine (echte) obere Ecke";
    }
    
    // dir: 0=right,1=down,2=left,3=up
    var dir = hole?1:0; // Bei Löchern nach unten, sonst nach rechts

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
                    var path = createPath(code,vEdges,i,j);
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
