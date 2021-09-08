/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/cm-chessboard
 * License: MIT, see file 'LICENSE'
 */

export const REGION = {
    reserve0: "reserve0",
    reserve1: "reserve1",
    board: "board"
}

export class ChessboardState {

    constructor() {
        this.squares = new Array(7+12+7).fill(undefined)
        this.orientation = undefined
        this.markers = []
        this.inputWhiteEnabled = false
        this.inputBlackEnabled = false
        this.inputEnabled = false
        this.squareSelectEnabled = false
    }

    // square codes

    // const SQUARE_COORDINATES = [
    //     "r00", "r10", "r20", "r30", "r40", "r50", "r60"
    //     "b30", "b31", "b32",
    //     "b20", "b21", "b22",
    //     "b10", "b11", "b12",
    //     "b00", "b01", "b02",
    //     "r01", "r11", "r22", "r31", "r41", "r51", "r61"
    // ]

    squareToIndex(square) {
        if(square.charAt(0) == 'r') {
            const reserve = parseInt(square.charCodeAt(2))
            const column = parseInt(square.charCodeAt(1))
            if(reserve == 0) {
                return 7+12+column
            } else {
                return column
            }
        } else {
            const row = parseInt(square.charAt(1))
            const col = parseInt(square.charAt(2))
            return 7 + 3*(3-row) + col
        }
    }

    setPiece(index, piece) {
        this.squares[index] = piece
    }

    addMarker(index, type) {
        this.markers.push({index: index, type: type})
    }

    removeMarkers(index = undefined, type = undefined) {
        if (!index && !type) {
            this.markers = []
        } else {
            this.markers = this.markers.filter((marker) => {
                if (!marker.type) {
                    if (index === marker.index) {
                        return false
                    }
                } else if (!index) {
                    if (marker.type === type) {
                        return false
                    }
                } else if (marker.type === type && index === marker.index) {
                    return false
                }
                return true
            })
        }
    }

    setPosition(fen) {
        if (fen) {
            const parts = fen.split(/\//)
            {
                const row = parts[0]
                for (let c = 0; c < 7; c++) {
                    const char = row.substr(c, 1)
                    let piece = undefined
                    if (char !== '.') {
                        if (char.toUpperCase() === char) {
                            piece = `w${char.toLowerCase()}`
                        } else {
                            piece = `b${char}`
                        }
                    }
                    this.squares[c] = piece
                }
            }
            for (let part = 0; part < 4; part++) {
                const row = parts[1+part]
                for (let c = 0; c < 3; c++) {
                    const char = row.substr(c, 1)
                    let piece = undefined
                    if (char !== '.') {
                        if (char.toUpperCase() === char) {
                            piece = `w${char.toLowerCase()}`
                        } else {
                            piece = `b${char}`
                        }
                    }
                    this.squares[7+part * 3 + c] = piece
                }
            }
            {
                const row = parts[5]
                for (let c = 0; c < 7; c++) {
                    const char = row.substr(c, 1)
                    let piece = undefined
                    if (char !== '.') {
                        if (char.toUpperCase() === char) {
                            piece = `w${char.toLowerCase()}`
                        } else {
                            piece = `b${char}`
                        }
                    }
                    this.squares[7+12+c] = piece
                }
            }
        }
    }

    getPosition() {
        let parts = new Array(6).fill("")
        {
            for (let i = 0; i < 7; i++) {
                const piece = this.squares[i]
                if (!piece) {
                    parts[0] += "."
                } else {
                    const color = piece.substr(0, 1)
                    const name = piece.substr(1, 1)
                    if (color === "w") {
                        parts[0] += name.toUpperCase()
                    } else {
                        parts[0] += name
                    }
                }
            }
        }
        for (let part = 0; part < 4; part++) {
            for (let i = 0; i < 3; i++) {
                const piece = this.squares[7 + part * 3 + i]
                if (!piece) {
                    parts[1+part] += "."
                } else {
                    const color = piece.substr(0, 1)
                    const name = piece.substr(1, 1)
                    if (color === "w") {
                        parts[1+part] += name.toUpperCase()
                    } else {
                        parts[1+part] += name
                    }
                }
            }
        }
        {
            for (let i = 0; i < 7; i++) {
                const piece = this.squares[7+12+i]
                if (!piece) {
                    parts[5] += "."
                } else {
                    const color = piece.substr(0, 1)
                    const name = piece.substr(1, 1)
                    if (color === "w") {
                        parts[5] += name.toUpperCase()
                    } else {
                        parts[5] += name
                    }
                }
            }
        }
        return parts.join("/")
    }

}