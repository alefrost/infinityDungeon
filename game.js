var ROWS = 20;
var COLS = 60;
var ACTORS = 10;
var MIN_LEAF_SIZE = 6;
var MAX_LEAF_SIZE = 20;
var map;

var player;
var actorList = [];
var livingEnemies;
var actorMap = {};


var root = createLeaf(0, 0, COLS, ROWS);
var leaves = [root];
var halls = [];

function clearGame() {
    var map;
    var player;
    var actorList = [];
    var livingEnemies;
    var actorMap = {};
    var root = createLeaf(0, 0, COLS, ROWS);
    var leaves = [root];
    var halls = [];
}
//runBasic();
//runComplex();

// Run game with random map
function runBasic() {
    initMap();
    initActors();
    display();    
}

// Run game with procedural generation
function runComplex() {
    initTestMap();
    splitLeaves();
    createRooms(root);
    drawHalls();
    initActors();
    display();
}

///////////////////////
//---DEBUG Methods---//
///////////////////////
function clearDebug() {
    $('#debug').text("");
}

function debug(msg) {
    $('#debug').append(msg + '<br />');
}
function debugJSON(json) {
    $('#debug').append(JSON.stringify(json) + '<br />');
}

///////////////////////
//----Game  Logic----//
///////////////////////
function initMap() {
    // create a new random map
    map = [];
    for (var y = 0; y < ROWS; y++) {
        var newRow = [];
        for (var x = 0; x < COLS; x++) {
            if (Math.random() > 0.8) newRow.push('#');
            else newRow.push('.');
        }
        map.push(newRow);
    }
}

function display() {
    $('#canvas').text("");
    for (var y = 0; y < ROWS; y++) {
        var line = "";
        for (var x = 0; x < COLS; x++) {
            if (actorMap[y + "_" + x] != null) {
                line += actorMap[y + "_" + x].display;
            } else {
                line += map[y][x];
            }
        }
        $('#canvas').append(line);
        $('#canvas').append('<br />');
    }
    $('#health').text(player.hp);
}

function randomInt(max) {
    return Math.floor(Math.random() * max);
}

function initActors() {
    // create actors at random locations
    actorList = [];
    for (var e = 0; e < ACTORS; e++) {
        // create new actor
        var actor = {
            name: e,
            x: 0,
            y: 0,
            hp: e === 0 ? 3 : 1,
            display: e === 0 ? '<span class="player">@</span>' :
                '<span class="enemy">e</span>'
        };
        do {
            // pick a random position that is both a floor and not occupied
            actor.y = randomInt(ROWS);
            actor.x = randomInt(COLS);
        } while (map[actor.y][actor.x] == '#' || actorMap[actor.y + "_" + actor.x] != null);

        // add references to the actor to the actors list & map
        actorMap[actor.y + "_" + actor.x] = actor;
        actorList.push(actor);
    }

    // the player is the first actor in the list
    player = actorList[0];
    livingEnemies = ACTORS - 1;
}

$(document).keyup(function (event) {
    var acted = false;
    if(player.hp > 0) {
        switch (event.keyCode) {
            case 37:
                // left arrow
                acted = moveTo(player, {
                    x: -1,
                    y: 0
                });
                break;
    
            case 38:
                // up arrow
                acted = moveTo(player, {
                    x: 0,
                    y: -1
                });
                break;
    
            case 39:
                // right arrow
                acted = moveTo(player, {
                    x: 1,
                    y: 0
                });
                break;
    
            case 40:
                // down arrow
                acted = moveTo(player, {
                    x: 0,
                    y: 1
                });
                break;
    
            case 27:
                // escape
                clearDebug();
                break;
            default:
                debug("not a valid action...<br />");
        }
        
        display();
    
        if (acted) for (var enemy in actorList) {
            // skip the player
            if (enemy == 0) continue;
    
            var e = actorList[enemy];
            if (e != null) aiAct(e);
        }

        display();
        
        // Prevent arrow keys from scrolling page
        var arrowkeys = [37,38,39,40];
        if ($.inArray(event.keyCode, arrowkeys)){
            event.preventDefault();
            return false;
        }
        return true;
    }
});

function canGo(actor, dir) {
    return actor.x + dir.x >= 0 && actor.x + dir.x <= COLS - 1 && actor.y + dir.y >= 0 && actor.y + dir.y <= ROWS - 1 && map[actor.y + dir.y][actor.x + dir.x] == '.';
}

function moveTo(actor, dir) {
    // check if actor can move in the given direction
    if (!canGo(actor, dir)) return false;

    // moves actor to the new location
    var newKey = (actor.y + dir.y) + '_' + (actor.x + dir.x);
    // if the destination tile has an actor in it
    if (actorMap[newKey] != null) {
        //decrement hitpoints of the actor at the destination tile
        var victim = actorMap[newKey];
        victim.hp--;

        // if it's dead remove its reference
        if (victim.hp == 0) {
            debug(actor.name + " killed " + victim.name);
            actorMap[newKey] = null;
            actorList[actorList.indexOf(victim)] = null;
            if (victim != player) {
                livingEnemies--;
                if (livingEnemies == 0) {
                    // victory message
                    $('#endgame').html("<span class='player'>Victory</span>");
                }
            }
        }
    } else {
        // remove reference to the actor's old position
        actorMap[actor.y + '_' + actor.x] = null;

        // update position
        actor.y += dir.y;
        actor.x += dir.x;

        // add reference to the actor's new position
        actorMap[actor.y + '_' + actor.x] = actor;
    }
    return true;

}

function aiAct(actor) {
    var directions = [{
        x: -1,
        y: 0
    }, {
        x: 1,
        y: 0
    }, {
        x: 0,
        y: -1
    }, {
        x: 0,
        y: 1
    }];
    var dx = player.x - actor.x;
    var dy = player.y - actor.y;

    // if player is far away, walk randomly
    if (Math.abs(dx) + Math.abs(dy) > 6)
    // try to walk in random directions until you succeed once
    while (!moveTo(actor, directions[randomInt(directions.length)])) {};

    // otherwise walk towards player
    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) {
            // left
            moveTo(actor, directions[0]);
        } else {
            // right
            moveTo(actor, directions[1]);
        }
    } else {
        if (dy < 0) {
            // up
            moveTo(actor, directions[2]);
        } else {
            // down
            moveTo(actor, directions[3]);
        }
    }
    if (player.hp < 1) {
        // game over message
        $('#endgame').html("<span class='enemy'>GAMEOVER</span>");
    }
}

////////////////////////////////////////
/*Map Generation*/
/*Binary Tree Method*/
////////////////////////////////////////

//initTestMap();
//splitLeaves();

//createRooms(root);
//display();
//debugJSON(map);
//debugJSON(leaves);

function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

function createLeaf(x, y, w, h) {
    return {
        x: x,
        y: y,
        width: w,
        height: h,
        left: null,
        right: null
    };
}

function split(leaf) {
    if (leaf.left != null || leaf.right != null) return false;

    var splitH = Math.random() > 0.5;
    if (leaf.width > leaf.height && leaf.height / leaf.width > 0.05) splitH = false;
    else if (leaf.height > leaf.width && leaf.width / leaf.height > 0.05) splitH = true;

    var max = (splitH ? leaf.height : leaf.width) - MIN_LEAF_SIZE;
    if (max < MIN_LEAF_SIZE) return false;

    var div = randomNumber(MIN_LEAF_SIZE, max);
    if (splitH) {
        leaf.left = createLeaf(leaf.x, leaf.y, leaf.width, div);
        leaf.right = createLeaf(leaf.x, leaf.y + div, leaf.width, leaf.height - div);
    } else {
        leaf.left = createLeaf(leaf.x, leaf.y, div, leaf.height);
        leaf.right = createLeaf(leaf.x + div, leaf.y, leaf.width - div, leaf.height);
    }

    return true;
}

function splitLeaves() {
    var didSplit = true;
    while (didSplit) {
        didSplit = false;
        for (var i = 0; i < leaves.length; i++) {
            if (leaves[i].left == null && leaves[i].right == null) {
                if (leaves[i].width > MAX_LEAF_SIZE || leaves[i].height > MAX_LEAF_SIZE || Math.random() > 0.75) {
                    if (split(leaves[i])) {
                        leaves.push(leaves[i].left);
                        leaves.push(leaves[i].right);
                        didSplit = true;
                    }
                }
            }
        }
    }
}

function createRooms(leaf) {
    if (leaf.left != null || leaf.right != null) {
        if (leaf.left != null) createRooms(leaf.left);
        if (leaf.right != null) createRooms(leaf.right);
        if (leaf.left != null && leaf.right != null) {
            createHalls(getRoom(leaf.left), getRoom(leaf.right));   
        }
    } else {
        var roomSize = {
            x: randomNumber(3, leaf.width - 2),
            y: randomNumber(3, leaf.height - 2)
        };
        var roomPos = {
            x: leaf.x + randomNumber(1, leaf.width - roomSize.x - 1),
            y: leaf.y + randomNumber(1, leaf.height - roomSize.y - 1)
        };
        leaf.room = {
            position: roomPos,
            size: roomSize
        };
        drawRoom(roomPos, roomSize);
    }
}

function drawRoom(roomPos, roomSize) {
    for (var y = roomPos.y; y <= roomPos.y + roomSize.y; y++) {
        for (var x = roomPos.x; x <= roomPos.x + roomSize.x; x++) {
            if ( y == roomPos.y || x == roomPos.x || y == roomPos.y + roomSize.y || x == roomPos.x + roomSize.x) {
                map[y][x] = '.';
            } else {
                map[y][x] = '.';
            }
        }
    }
}

function initTestMap() {
    // create a new random map
    map = [];
    for (var y = 0; y < ROWS; y++) {
        var newRow = [];
        for (var x = 0; x < COLS; x++) {
            newRow.push("#");
        }
        map.push(newRow);
    }
}

function getRoom(leaf) {
    if (leaf.room != null) return leaf.room;
    
    var lRoom;
    var rRoom;
    if (leaf.left != null) 
        lRoom = getRoom(leaf.left);
    if (leaf.right != null)
        rRoom = getRoom(leaf.right);
    if (leaf.left == null && leaf.right == null) return false;
    else if (leaf.left == null)
        return rRoom;
    else if (leaf.right == null)
        return lRoom;
    else if (Math.random() > 0.5)
        return lRoom;
    else
        return rRoom;
}

function createHalls(r1, r2) {
    var point1 = {x: randomNumber(r1.position.x,r1.position.x+r1.size.x), y: randomNumber(r1.position.y,r1.position.y+r1.size.y)};
    var point2 = {x: randomNumber(r2.position.x,r2.position.x+r2.size.x), y: randomNumber(r2.position.y,r2.position.y+r2.size.y)};
    
    var w = point2.x-point1.x;
    var h = point2.y-point1.y;
    
    if (w < 0) {
        if (h < 0) {
            if (Math.random() > .5) {
                halls.push({x:point2.x,y:point1.y,w:Math.abs(w),h:1});
                halls.push({x:point2.x,y:point2.y,w:1,h:Math.abs(h)});
            } else {
                halls.push({x:point2.x,y:point2.y,w:Math.abs(w),h:1});
                halls.push({x:point1.x,y:point2.y,w:1,h:Math.abs(h)});
            }        
        } else if (h > 0) {
            if (Math.random() > .5) {
                halls.push({x:point2.x,y:point1.y,w:Math.abs(w),h:1});
                halls.push({x:point2.x,y:point1.y,w:1,h:Math.abs(h)});
            } else {
                halls.push({x:point2.x,y:point2.y,w:Math.abs(w),h:1});
                halls.push({x:point1.x,y:point1.y,w:1,h:Math.abs(h)});
            }
        } else {// h == 0 
            halls.push({x:point2.x,y:point2.y,w:Math.abs(w),h:1});
        }
    } else if (w > 0) {
        if (h < 0) {
            if (Math.random() > .5) {
                halls.push({x:point1.x,y:point2.y,w:Math.abs(w),h:1});
                halls.push({x:point1.x,y:point2.y,w:1,h:Math.abs(h)});
            } else {
                halls.push({x:point1.x,y:point1.y,w:Math.abs(w),h:1});
                halls.push({x:point2.x,y:point2.y,w:1,h:Math.abs(h)});
            }
        } else if (h > 0) {
            if (Math.random() > .5) {
                halls.push({x:point1.x,y:point1.y,w:Math.abs(w),h:1});
                halls.push({x:point2.x,y:point1.y,w:1,h:Math.abs(h)});
            } else {
                halls.push({x:point1.x,y:point2.y,w:Math.abs(w),h:1});
                halls.push({x:point1.x,y:point1.y,w:1,h:Math.abs(h)});
            }
        } else {// h == 0 
            halls.push({x:point1.x,y:point1.y,w:Math.abs(w),h:1});
        }
    } else { // w == 0
        if (h < 0) {
            halls.push({x:point2.x,y:point2.y,w:Math.abs(w),h:1});
        } else if (h > 0) {
            halls.push({x:point1.x,y:point1.y,w:Math.abs(w),h:1});
        }
    }
}

function drawHalls() {
    for(var i=0;i<halls.length;i++) {
        // overlay halls on map 
        for (var y=halls[i].y;y<halls[i].y+halls[i].h;y++) {
            for (var x=halls[i].x;x<halls[i].x+halls[i].w;x++) {
                map[y][x] = ".";   
            }
        }
    }
}
