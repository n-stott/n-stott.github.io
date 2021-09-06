searchBestMove = Module.cwrap('searchBestMove', 'number', ['string', 'string', 'string', 'number', 'number'])
get_board = Module.cwrap('board', 'string', [])
get_reserve0 = Module.cwrap('reserve0', 'string', [])
get_reserve1 = Module.cwrap('reserve1', 'string', [])

validAction = Module.cwrap('validAction', 'number', ['string', 'string', 'string', 'number', 'string', 'string', 'number', 'number'])
playAction = Module.cwrap('playAction', 'number', ['string', 'string', 'string', 'number', 'string', 'string', 'number', 'number'])

class Yokai {

    constructor(board, reserve0, reserve1, player) {
        this.board = board;
        this.reserve0 = reserve0;
        this.reserve1 = reserve1;
        this.currentPlayer = player;
    }

    static Default() {
        return new Yokai('TKB.P..p.bkt', '', '', 0);
    }

    update() {
        this.board = get_board()
        this.reserve0 = get_reserve0()
        this.reserve1 = get_reserve1()
        this.currentPlayer = 1-this.currentPlayer
    }

    setPosition(fen) {
        if (fen) {
            const parts = fen.split(/\//)
            {
                const row = parts[0]
                const reserve0 = ""
                for (let c = 0; c < row.length; c++) {
                    const char = row.substr(c, 1)
                    let piece = '.'
                    if (char !== '.') {
                        if (char.toUpperCase() === char) {
                            piece = char.toLowerCase()
                        } else {
                            piece = char.toUpperCase()
                        }
                        if(piece === 'r') piece = 't'
                        if(piece === 'R') piece = 'T'
                        if(piece === 'q') piece = 's'
                        if(piece === 'Q') piece = 'S'
                    }
                    reserve0 += piece
                }
                this.reserve0 = reserve0
            }
            {
                const board = "";
                for (let part = 3; part >= 0; --part) {
                    const row = parts[1+3-part]
                    for (let c = 0; c < 3; c++) {
                        const char = row.substr(c, 1)
                        let piece = '.'
                        if (char !== '.') {
                            if (char.toUpperCase() === char) {
                                piece = char.toLowerCase()
                            } else {
                                piece = char.toUpperCase()
                            }
                            if(piece === 'r') piece = 't'
                            if(piece === 'R') piece = 'T'
                            if(piece === 'q') piece = 's'
                            if(piece === 'Q') piece = 'S'
                        }
                        board += piece
                    }
                }
                this.board = board
            }
            {
                const row = parts[5]
                const reserve1 = ""
                for (let c = 0; c < row.length; c++) {
                    const char = row.substr(c, 1)
                    let piece = '.'
                    if (char !== '.') {
                        if (char.toUpperCase() === char) {
                            piece = char.toLowerCase()
                        } else {
                            piece = char.toUpperCase()
                        }
                        if(piece === 'r') piece = 't'
                        if(piece === 'R') piece = 'T'
                        if(piece === 'q') piece = 's'
                        if(piece === 'Q') piece = 'S'
                    }
                    reserve1 += piece
                }
                this.reserve1 = reserve1
            }
        }
        console.log("set fen : ", fen, this.board, this.reserve0, this.reserve1)
    }

    getPosition() {
        let parts = new Array(6).fill("")
        {
            for (let i = 0; i < this.reserve0.length; i++) {
                let piece = this.reserve0[i]
                if (!piece) {
                } else {
                    if(piece === 't') piece = 'r'
                    if(piece === 'T') piece = 'R'
                    if(piece === 's') piece = 'q'
                    if(piece === 'S') piece = 'Q'
                    if (piece.toUpperCase() === piece) {
                        piece = piece.toLowerCase()
                    } else {
                        piece = piece.toUpperCase()
                    }
                    parts[0] += piece
                }
            }
            for (let i = this.reserve0.length; i < 7; i++) parts[0] += '.'
        }
        for (let part = 3; part >= 0; --part) {
            for (let i = 0; i < 3; i++) {
                let piece = this.board[3*part+i]
                if (!piece) {
                    parts[1+part] += "."
                } else {
                    if(piece === 't') piece = 'r'
                    if(piece === 'T') piece = 'R'
                    if(piece === 's') piece = 'q'
                    if(piece === 'S') piece = 'Q'
                    if (piece.toUpperCase() === piece) {
                        piece = piece.toLowerCase()
                    } else {
                        piece = piece.toUpperCase()
                    }
                    parts[1+3-part] += piece
                }
            }
        }
        {
            for (let i = 0; i < this.reserve1.length; i++) {
                let piece = this.reserve1[i]
                if (!piece) {
                } else {
                    if(piece === 't') piece = 'r'
                    if(piece === 'T') piece = 'R'
                    if(piece === 's') piece = 'q'
                    if(piece === 'S') piece = 'Q'
                    if (piece.toUpperCase() === piece) {
                        piece = piece.toLowerCase()
                    } else {
                        piece = piece.toUpperCase()
                    }
                    parts[5] += piece
                }
            }
            for (let i = this.reserve1.length; i < 7; i++) parts[5] += '.'
        }
        const fen = parts.join("/")
        console.log("get fen : ", this.board, this.reserve0, this.reserve1, fen)
        return fen
    }

    autoPlay(depth) {
        console.log("before AI : ", this.toString());
        searchBestMove(
            this.board,
            this.reserve0,
            this.reserve1,
            this.currentPlayer,
            depth
        )
        this.update()
        console.log("after AI : ", this.toString());
    }

    autoMove(depth) {
        console.log("before AI : ", this.toString());
        searchBestMove(
            this.board,
            this.reserve0,
            this.reserve1,
            this.currentPlayer,
            depth
        )
        this.update()
        console.log("after AI : ", this.toString());
    }

    move(move) {
        const src = move.from
        const dst = move.to
        console.log('play', src, dst);
        const idst = parseInt(dst[1]);
        const jdst = parseInt(dst[2]);
        const d = 3*idst+jdst;
        if(src[0] == 'b' && dst[0] == 'b') {
            const isrc = parseInt(src[1]);
            const jsrc = parseInt(src[2]);
            const s = 3*isrc+jsrc;
            return this.play("move", this.board[s], s, d);
        } else if(src[0] == 'r' && src[2] == '0' && dst[0] == 'b'){
            const i0 = parseInt(src[1]);
            const p = i0;
            return this.play("drop", this.reserve0[p], p, d);
        }
    }

    play(action, piece, start, end) {
        console.log("attempting : ", action, piece, start, end, this.board, this.reserve0, this.reserve1)
        let valid = validAction(
            this.board,
            this.reserve0,
            this.reserve1,
            this.currentPlayer,
            action,
            piece,
            start,
            end
        )
        if(valid) {
            console.log("before HU : ", this.toString());
            playAction(
                this.board,
                this.reserve0,
                this.reserve1,
                this.currentPlayer,
                action,
                piece,
                start,
                end
            )
            this.update()
            console.log("after HU : ", this.toString());
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
    
}

class GameHistory {
    constructor() {
        this.history = [];
    }
}