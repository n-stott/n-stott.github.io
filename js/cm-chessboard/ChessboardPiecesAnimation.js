/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/cm-chessboard
 * License: MIT, see file 'LICENSE'
 */

const CHANGE_TYPE = {
    move: 0,
    appear: 1,
    disappear: 2
}

export class ChessboardPiecesAnimation {

    constructor(view, fromSquares, toSquares, duration, callback) {
        this.view = view
        if (fromSquares && toSquares) {
            this.animatedElements = this.createAnimation(fromSquares, toSquares)
            this.duration = duration
            this.callback = callback
            this.frameHandle = requestAnimationFrame(this.animationStep.bind(this))
        }
    }

    seekChanges(fromSquares, toSquares) {
        const appearedList = [], disappearedList = [], changes = []
        for (let i = 0; i < 7+12+7; i++) {
            const previousSquare = fromSquares[i]
            const newSquare = toSquares[i]
            if (newSquare !== previousSquare) {
                if (newSquare) {
                    appearedList.push({piece: newSquare, index: i})
                }
                if (previousSquare) {
                    disappearedList.push({piece: previousSquare, index: i})
                }
            }
        }
        appearedList.forEach((appeared) => {
            let shortestDistance = 10000
            let foundMoved = undefined
            disappearedList.forEach((disappeared) => {
                if (appeared.piece === disappeared.piece) {
                    const moveDistance = this.squareDistance(appeared.index, disappeared.index)
                    if (moveDistance < shortestDistance) {
                        foundMoved = disappeared
                        shortestDistance = moveDistance
                    }
                }
            })
            if (foundMoved) {
                disappearedList.splice(disappearedList.indexOf(foundMoved), 1) // remove from disappearedList, because it is moved now
                changes.push({
                    type: CHANGE_TYPE.move,
                    piece: appeared.piece,
                    atIndex: foundMoved.index,
                    toIndex: appeared.index
                })
            } else {
                changes.push({type: CHANGE_TYPE.appear, piece: appeared.piece, atIndex: appeared.index})
            }
        })
        disappearedList.forEach((disappeared) => {
            changes.push({type: CHANGE_TYPE.disappear, piece: disappeared.piece, atIndex: disappeared.index})
        })
        return changes
    }

    createAnimation(fromSquares, toSquares) {
        const changes = this.seekChanges(fromSquares, toSquares)
        const animatedElements = []
        changes.forEach((change) => {
            const animatedItem = {
                type: change.type
            }
            switch (change.type) {
                case CHANGE_TYPE.move:
                    animatedItem.element = this.view.getPiece(change.atIndex)
                    animatedItem.atPoint = this.view.indexToPoint(change.atIndex)
                    animatedItem.toPoint = this.view.indexToPoint(change.toIndex)
                    break
                case CHANGE_TYPE.appear:
                    animatedItem.element = this.view.drawPiece(change.atIndex, change.piece)
                    animatedItem.element.style.opacity = 0
                    break
                case CHANGE_TYPE.disappear:
                    animatedItem.element = this.view.getPiece(change.atIndex)
                    break
            }
            animatedElements.push(animatedItem)
        })
        return animatedElements
    }

    animationStep(time) {
        if (!this.startTime) {
            this.startTime = time
        }
        const timeDiff = time - this.startTime
        if (timeDiff <= this.duration) {
            this.frameHandle = requestAnimationFrame(this.animationStep.bind(this))
        } else {
            cancelAnimationFrame(this.frameHandle)
            this.callback()
            return
        }
        const t = Math.min(1, timeDiff / this.duration)
        const progress = t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t // easeInOut
        this.animatedElements.forEach((animatedItem) => {
            if (animatedItem.element) {
                switch (animatedItem.type) {
                    case CHANGE_TYPE.move:
                        animatedItem.element.transform.baseVal.removeItem(0)
                        const transform = (this.view.board_svg.createSVGTransform())
                        transform.setTranslate(
                            animatedItem.atPoint.x + (animatedItem.toPoint.x - animatedItem.atPoint.x) * progress,
                            animatedItem.atPoint.y + (animatedItem.toPoint.y - animatedItem.atPoint.y) * progress)
                        animatedItem.element.transform.baseVal.appendItem(transform)
                        break
                    case CHANGE_TYPE.appear:
                        animatedItem.element.style.opacity = progress
                        break
                    case CHANGE_TYPE.disappear:
                        animatedItem.element.style.opacity = 1 - progress
                        break
                }
            } else {
                console.warn("animatedItem has no element", animatedItem)
            }
        })
    }

    squareDistance(index1, index2) {
        const src = this.view.indexToPoint(index1)
        const dst = this.view.indexToPoint(index2)
        const value = Math.max(Math.abs(src.x - dst.x), Math.abs(src.y - dst.y))
        return value
    }

}