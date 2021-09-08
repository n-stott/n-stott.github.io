

class Yokai {

    constructor(WasmModule, board, reserve0, reserve1, player) {
        this.board = board;
        this.reserve0 = reserve0;
        this.reserve1 = reserve1;
        this.currentPlayer = player;
        this.apiSearchBestMove = WasmModule.cwrap('searchBestMove', 'number', ['string', 'string', 'string', 'number', 'number'])
        this.apiInit = WasmModule.cwrap('init', 'void', [])
        this.apiBoard = WasmModule.cwrap('board', 'string', [])
        this.apiReserve0 = WasmModule.cwrap('reserve0', 'string', [])
        this.apiReserve1 = WasmModule.cwrap('reserve1', 'string', [])
        this.apiValidAction = WasmModule.cwrap('validAction', 'number', ['string', 'string', 'string', 'number', 'string', 'string', 'number', 'number'])
        this.apiPlayAction = WasmModule.cwrap('playAction', 'number', ['string', 'string', 'string', 'number', 'string', 'string', 'number', 'number'])
        this.initInternal()
    }

    static Default(WasmModule) {
        return new Yokai(WasmModule, 'TKB.P..p.bkt', '', '', 0);
    }

    pieceToInternal(piece) {
        if (piece !== '.') {
            if (piece.toUpperCase() === piece) {
                piece = piece.toLowerCase()
            } else {
                piece = piece.toUpperCase()
            }
            if(piece === 'r') piece = 't'
            if(piece === 'R') piece = 'T'
            if(piece === 'q') piece = 's'
            if(piece === 'Q') piece = 'S'
        }
        return piece
    }

    pieceFromInternal(piece) {
        if (piece !== '.') {
            if(piece === 't') piece = 'r'
            if(piece === 'T') piece = 'R'
            if(piece === 's') piece = 'q'
            if(piece === 'S') piece = 'Q'
            if (piece.toUpperCase() === piece) {
                piece = piece.toLowerCase()
            } else {
                piece = piece.toUpperCase()
            }
        }
        return piece
    }

    setPosition(fen) {
        this.reserve0 = ""
        this.board = ""
        this.reserve1 = ""
        if (fen) {
            const parts = fen.split(/\//)

            const res0 = parts[0]
            for (let c = 0; c < res0.length; c++) {
                const piece = res0.substr(c, 1)
                this.reserve0 += this.pieceToInternal(piece)
            }

            for (let part = 3; part >= 0; --part) {
                const row = parts[1+3-part]
                for (let c = 0; c < 3; c++) {
                    const piece = row.substr(c, 1)
                    this.board += this.pieceToInternal(piece)
                }
            }
            
            const res1 = parts[5]
            for (let c = 0; c < res1.length; c++) {
                const piece = res1.substr(c, 1)
                this.reserve1 += this.pieceToInternal(piece)
            }
        }
    }

    getPosition() {
        let parts = new Array(6).fill("")
        for (let i = 0; i < this.reserve0.length; i++) {
            let piece = this.reserve0[i]
            if (!piece) { } else {
                parts[0] += this.pieceFromInternal(piece)
            }
        }
        for (let i = this.reserve0.length; i < 7; i++) parts[0] += '.'

        for (let part = 3; part >= 0; --part) {
            for (let i = 0; i < 3; i++) {
                let piece = this.board[3*part+i]
                if (!piece) {
                    parts[1+part] += "."
                } else {
                    parts[1+3-part] += this.pieceFromInternal(piece)
                }
            }
        }

        for (let i = 0; i < this.reserve1.length; i++) {
            let piece = this.reserve1[i]
            if (!piece) { } else {
                parts[5] += this.pieceFromInternal(piece)
            }
        }
        for (let i = this.reserve1.length; i < 7; i++) parts[5] += '.'

        const fen = parts.join("/")
        return fen
    }

    autoMove(depth) {
        var t0 = performance.now()
        this.searchBestMove(depth)
        var t1 = performance.now()
        console.log("AutoMove took " + (t1 - t0) + " milliseconds.")
        this.update()
        this.swapPlayer()
    }

    moveToAction(move) {
        const src = move.from
        const dst = move.to
        const idst = parseInt(dst[1]);
        const jdst = parseInt(dst[2]);
        const d = 3*idst+jdst;
        if(src[0] == 'b' && dst[0] == 'b') {
            const isrc = parseInt(src[1]);
            const jsrc = parseInt(src[2]);
            const s = 3*isrc+jsrc;
            return { action: "move", piece: this.board[s], src: s, dst: d};
        } else if(src[0] == 'r' && src[2] == '0' && dst[0] == 'b'){
            const i0 = parseInt(src[1]);
            const p = i0;
            return { action: "drop", piece: this.reserve0[p], src: p, dst: d};
        } else if(src[0] == 'r' && src[2] == '1' && dst[0] == 'b'){
            const i0 = parseInt(src[1]);
            const p = i0;
            return { action: "drop", piece: this.reserve1[p], src: p, dst: d};
        }
        return undefined
    }

    move(move) {
        const action = this.moveToAction(move)
        if(action) {
            return this.play(action.action, action.piece, action.src, action.dst)
        }
        return false;
    }

    moves(square) {
        let moves = [];
        for(let i = 0; i < 4; ++i) {
            for(let j = 0; j < 3; ++j) {
                const to = 'b'+i+j;
                const move = {from:square, to:to}
                if(this.validMove(move)) {
                    moves.push(move)
                }
            }
        }
        return moves
    }

    validMove(move) {
        const action = this.moveToAction(move)
        return this.validAction(action.action, action.piece, action.src, action.dst)
    }

    play(action, piece, start, end) {
        let valid = this.validAction(action, piece, start, end)
        if(valid) {
            this.playAction(action, piece, start, end)
            this.update()
            this.swapPlayer()
        }
        return valid;
    }

    winner() {
        if(this.reserve0.length > 0 && this.reserve0[this.reserve0.length-1] == 'k') return 0;
        if(this.reserve1.length > 0 && this.reserve1[this.reserve1.length-1] == 'K') return 1;
        return -1;
    }

    toString() {
        return this.board + '|' + this.reserve0 + '|' + this.reserve1;
    }

    swapPlayer() {
        this.currentPlayer = 1-this.currentPlayer
    }

    // Low level api

    initInternal() {
        this.apiInit();
    }

    validAction(action, piece, start, end) {
        return this.apiValidAction(this.board, this.reserve0, this.reserve1, this.currentPlayer, action, piece, start, end)
    }

    playAction(action, piece, start, end) {
        return this.apiPlayAction(this.board, this.reserve0, this.reserve1, this.currentPlayer, action, piece, start, end)
    }

    searchBestMove(depth) {
        console.log("searchBestMove", this.board, this.reserve0, this.reserve1, this.currentPlayer, depth)
        return this.apiSearchBestMove(this.board, this.reserve0, this.reserve1, this.currentPlayer, depth)
    }

    update() {
        this.board = this.apiBoard()
        this.reserve0 = this.apiReserve0()
        this.reserve1 = this.apiReserve1()
    }
    
}

class GameHistory {
    constructor() {
        this.history = [];
    }
}