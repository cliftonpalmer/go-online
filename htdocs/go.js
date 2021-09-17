var canvas = document.getElementById("game-canvas");
var context = canvas.getContext("2d");

var backgroundColor = '#F5DEB3';
var gridColor = '#8B4513';
var boardSize = 19;

var border = canvas.width / 10;
var boardWidth = canvas.width - (border * 2);
var boardHeight = canvas.height - (border * 2);

var cellWidth = boardWidth / (boardSize - 1);
var cellHeight = boardHeight / (boardSize - 1);

var lastX;
var lastY;

/* state of pieces 
    0: empty
    1: white
    2: black
*/
var session = 0;
var playerStone;

var state = [];
for (var i = 0; i < boardSize; i++)
{
    state[i] = [];
    for (var j = 0; j < boardSize; j++)
    {
        state[i][j] = 0;
    }
}

// @connect
// Connect to the websocket
var socket;
const connect = function() {
    return new Promise((resolve, reject) => {
        const socketProtocol = (window.location.protocol === 'https:' ? 'wss:' : 'ws:')
        const port = 3000;
        const socketUrl = `${socketProtocol}//${window.location.hostname}:${port}/ws/`

        // Define socket
        socket = new WebSocket(socketUrl);

        socket.onopen = (e) => {
            // Resolve the promise - we are connected
            resolve();
        }

        socket.onmessage = (msg) => {
            // Any data from the server can be manipulated here.
            let parsed = JSON.parse(msg.data);
            switch (parsed.type) {
                case "board":
                    console.log("Setting board state");
                    parsed.data.forEach( function (move, index) {
                        state[move.x][move.y] = move.state;
                    });
                    drawGrid();
                    break;
                default:
                    console.log(msg);
            }
        }

        socket.onerror = (e) => {
            // Return an error if any occurs
            console.log(e);
            resolve();
            // Try to connect again
            connect();
        }
    });
}

// @isOpen
// check if a websocket is open
const isOpen = function(ws) {
    console.log(ws.readyState);
    return ws.readyState === ws.OPEN
}


// finish grid
function drawGrid()
{    
    
    /* draw board square */
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    /* draw board grid */
    context.fillStyle = gridColor;
    for (var i = 0; i < boardSize - 1; i++)
    {
        for (var j = 0; j < boardSize - 1; j++)
        {
            context.fillRect(
                i * cellWidth + border, 
                j * cellHeight + border, 
                cellWidth - 1, 
                cellHeight - 1
            );
        }
    }
    
    /* draw quarter marks and center mark on grid */
    var quarter = Math.floor((boardSize - 1) / 4);
    var markerSize = 8;
    var markerMargin = (markerSize / 2) + 0.5;
    
    context.fillStyle = backgroundColor;
    if (!!(boardSize % 2))
    {
        context.fillRect(
            (((boardSize - 1) / 2) * cellWidth) + border - markerMargin, 
            (((boardSize - 1) / 2) * cellWidth) + border - markerMargin,
            markerSize, 
            markerSize
        );
    }
    context.fillRect(
        (quarter * cellWidth) + border - markerMargin, 
        (quarter * cellWidth) + border - markerMargin, 
        markerSize, 
        markerSize
    );
    context.fillRect(
        (((boardSize - 1) - quarter) * cellWidth) + border - markerMargin, 
        (quarter * cellWidth) + border - markerMargin, 
        markerSize, 
        markerSize
    );
    context.fillRect(
        (((boardSize - 1) - quarter) * cellWidth) + border - markerMargin, 
        (((boardSize - 1) - quarter) * cellWidth) + border - markerMargin, 
        markerSize, 
        markerSize
    );
    context.fillRect(
        (quarter * cellWidth) + border - markerMargin,
        (((boardSize - 1) - quarter) * cellWidth) + border - markerMargin,
        markerSize, 
        markerSize
    );
    
    /* draw text labels for grid */
    var size = canvas.width / 40;
    var textSpacing = 10;
    context.fillStyle = '#000000';
    context.font = size + "px Arial";
    
    for (i = 0; i < boardSize; i++)
    {
        context.fillText(
            (i + 1), textSpacing, 
            ((canvas.height - border) - (i * cellHeight)) + (size / 3)
        );
        context.fillText(
            (i + 1), canvas.width - (size + textSpacing), 
            ((canvas.height - border) - (i * cellHeight)) + (size / 3)
        );

        context.fillText(
            (String.fromCharCode(97 + i)),
            (border + (i * cellHeight) + (size / 3)) - (size / 1.5), 
            textSpacing + size
        );
        context.fillText(
            (String.fromCharCode(97 + i)), 
            (border + (i * cellHeight) + (size / 3)) - (size / 1.5), 
            canvas.height - (textSpacing * 2)
        );
    }

    drawPieces();
}

function drawPieces() {
    /* draw pieces */
    for (var i = 0; i < boardSize; i++)
    {
        for (var j = 0; j < boardSize; j++)
        {
            switch(state[i][j]) {
                case 1:
                    placeStone(
                        (i * cellWidth) + border, 
                        (j * cellWidth) + border, 
                        'rgba(255, 255, 255, 1)'
                    );
                    break;
                case 2:
                    placeStone(
                        (i * cellWidth) + border, 
                        (j * cellWidth) + border, 
                        'rgba(0, 0, 0, 1)'
                    );
                    break;
                default:
            }
        }
    }
}

canvas.addEventListener('mousedown', function(evt) 
{
    try {
        // push state change to backend
        if(isOpen(socket)) {
            socket.send(JSON.stringify({
                "type":"move",
                "data": {
                    "session":session,
                    "x":lastX,
                    "y":lastY,
                    "state":state[lastX][lastY] > 0 ? 0 : playerStone
                }
            }));
        } else {
            console.log("Websocket is closed");
        }
    } catch(e) {
        console.log(e);
    }
});

canvas.addEventListener('mousemove', function(evt) 
{
    var position = getGridPoint(evt);

    if ((position.x != lastX) || (position.y != lastY))
    {
        drawGrid();
        if (
            ((position.x >=0) && (position.x < boardSize)) && 
            ((position.y >=0) && (position.y < boardSize))
        ) {
            placeStone(
                (position.x * cellWidth) + border, 
                (position.y * cellWidth) + border, 
                'rgba(0, 0, 0, 0.2)'
            );
        }
    }
    lastX = position.x;
    lastY = position.y;        
});

function placeStone(x, y, color)
{
    var radius = cellWidth / 2;
    
    context.beginPath();
    context.arc(x, y, radius, 0, 2 * Math.PI, false);
    context.fillStyle = color;    
    context.fill();
    context.lineWidth = 5;
}

function getGridPoint(evt)
{
    var rect = canvas.getBoundingClientRect();
        
    var x = Math.round(
        (evt.clientX-border-rect.left) / (rect.right-2*border-rect.left) * boardWidth
    );
    var y = Math.round(
        (evt.clientY-border-rect.top) / (rect.bottom-2*border-rect.top) * boardHeight
    );
    
    var roundX = Math.round(x / cellWidth);
    var roundY = Math.round(y / cellHeight);
    
    return {
        x: roundX,
        y: roundY
    };
}

// finish
document.getElementById("new").onclick = function () {
    // TODO: new game, new session, etc
};

const stones = document.getElementById("stones");
playerStone = stones.selectedIndex;
stones.onchange = function () {
    // let player pick stone type
    playerStone = stones.selectedIndex;
    console.log(`Player changed stone to ${playerStone}`);
};

connect();
