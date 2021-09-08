/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/cm-chessboard
 * License: MIT, see file 'LICENSE'
 */

import {ChessboardMoveInput} from "./ChessboardMoveInput.js"
import {COLOR, INPUT_EVENT_TYPE, BORDER_TYPE} from "./Chessboard.js"
import {ChessboardPiecesAnimation} from "./ChessboardPiecesAnimation.js"

export const SQUARE_COORDINATES = [
    "r00", "r10", "r20", "r30", "r40", "r50", "r60",
    "b30", "b31", "b32",
    "b20", "b21", "b22",
    "b10", "b11", "b12",
    "b00", "b01", "b02",
    "r01", "r11", "r21", "r31", "r41", "r51", "r61", 
]

export class ChessboardView {

    constructor(chessboard, callbackAfterCreation) {
        this.animationRunning = false
        this.currentAnimation = undefined
        this.chessboard = chessboard
        this.moveInput = new ChessboardMoveInput(this,
            this.moveStartCallback.bind(this),
            this.moveDoneCallback.bind(this),
            this.moveCanceledCallback.bind(this)
        )
        this.animationQueue = []
        if (chessboard.props.sprite.cache) {
            this.cacheSprite()
        }
        if (chessboard.props.responsive) {
            // noinspection JSUnresolvedVariable
            if (typeof ResizeObserver !== "undefined") {
                // noinspection JSUnresolvedFunction
                this.resizeObserver = new ResizeObserver(() => {
                    this.handleResize()
                })
                this.resizeObserver.observe(this.chessboard.board_element)
            } else {
                this.resizeListener = this.handleResize.bind(this)
                window.addEventListener("resize", this.resizeListener)
            }
        }

        this.pointerDownListener = this.pointerDownHandler.bind(this)
        this.chessboard.board_element.addEventListener("mousedown", this.pointerDownListener)
        this.chessboard.board_element.addEventListener("touchstart", this.pointerDownListener)

        this.createSvgAndGroups()
        this.updateMetrics()
        callbackAfterCreation(this)
        if (chessboard.props.responsive) {
            this.handleResize()
        }
    }

    pointerDownHandler(e) {
        this.moveInput.onPointerDown(e)
    }

    destroy() {
        this.moveInput.destroy()
        if (this.resizeObserver) {
            this.resizeObserver.unobserve(this.chessboard.board_element);
        }
        if (this.resizeListener) {
            window.removeEventListener("resize", this.resizeListener)
        }
        this.chessboard.board_element.removeEventListener("mousedown", this.pointerDownListener)
        this.chessboard.board_element.removeEventListener("touchstart", this.pointerDownListener)
        Svg.removeElement(this.board_svg)
        this.animationQueue = []
        if (this.currentAnimation) {
            cancelAnimationFrame(this.currentAnimation.frameHandle)
        }
    }

    // Sprite //

    cacheSprite() {
        const wrapperId = "chessboardSpriteCache"
        if (!document.getElementById(wrapperId)) {
            const wrapper = document.createElement("div")
            wrapper.style.display = "none"
            wrapper.id = wrapperId
            document.body.appendChild(wrapper)
            const xhr = new XMLHttpRequest()
            xhr.open("GET", this.chessboard.props.sprite.url, true)
            xhr.onload = function () {
                wrapper.insertAdjacentHTML('afterbegin', xhr.response)
            }
            xhr.send()
        }
    }

    createSvgAndGroups() {
        let cssClass = this.chessboard.props.style.cssClass ? this.chessboard.props.style.cssClass : "default"
        if (this.board_svg) {
            Svg.removeElement(this.board_svg)
        }
        this.board_svg = Svg.createSvg(this.chessboard.board_element)
        this.board_svg.setAttribute("class", "cm-chessboard border-type-" + this.chessboard.props.style.borderType + " " + cssClass)
        this.updateMetrics()
        this.boardGroup = Svg.addElement(this.board_svg, "g", {class: "board"})
        this.coordinatesGroup = Svg.addElement(this.board_svg, "g", {class: "coordinates"})
        this.markersGroup = Svg.addElement(this.board_svg, "g", {class: "markers"})
        this.piecesGroup = Svg.addElement(this.board_svg, "g", {class: "pieces"})
    }

    updateMetrics() {
        this.width = this.chessboard.board_element.clientWidth
        this.height = this.chessboard.board_element.clientHeight
        if (this.chessboard.props.style.borderType === BORDER_TYPE.frame) {
            this.borderSize = this.width / 25
        } else if (this.chessboard.props.style.borderType === BORDER_TYPE.thin) {
            this.borderSize = this.width / 320
        } else {
            this.borderSize = 0
        }
        this.innerWidth = this.width - 2 * this.borderSize
        this.innerHeight = this.height - 2 * this.borderSize
        this.squareWidth = this.innerWidth / 7
        this.squareHeight = this.innerHeight / 6
        this.scalingX = this.squareWidth / this.chessboard.props.sprite.size
        this.scalingY = this.squareHeight / this.chessboard.props.sprite.size
        this.pieceXTranslate = (this.squareWidth / 2 - this.chessboard.props.sprite.size * this.scalingY / 2)
    }

    handleResize() {
        if (this.chessboard.props.style.aspectRatio) {
            this.chessboard.board_element.style.height = (this.chessboard.board_element.clientWidth * this.chessboard.props.style.aspectRatio) + "px"
        }
        if (this.chessboard.board_element.clientWidth !== this.width ||
            this.chessboard.board_element.clientHeight !== this.height) {
            this.updateMetrics()
            this.redraw()
        }
        this.board_svg.setAttribute("width", "100%") // safari bugfix
        this.board_svg.setAttribute("height", "100%")
    }

    redraw() {
        this.drawBoard(this.boardGroup)
        this.drawCoordinates()
        this.drawMarkers()
        this.setCursor()
        this.drawPieces(this.chessboard.state.squares)
    }

    // Board //

    drawBoard(boardGroup) {
        while (boardGroup.firstChild) {
            boardGroup.removeChild(boardGroup.lastChild)
        }
        // if (this.chessboard.props.style.borderType !== BORDER_TYPE.none) {
        //     let boardBorder = Svg.addElement(boardGroup, "rect", {width: this.width, height: this.height})
        //     boardBorder.setAttribute("class", "border")
        //     if (this.chessboard.props.style.borderType === BORDER_TYPE.frame) {
        //         const innerPos = this.borderSize
        //         let borderInner = Svg.addElement(boardGroup, "rect", {
        //             x: innerPos,
        //             y: innerPos,
        //             width: this.width - innerPos * 2,
        //             height: this.height - innerPos * 2
        //         })
        //         borderInner.setAttribute("class", "border-inner")
        //     }
        // }
        for (let i = 0; i < 7+12+7; i++) {
            const index = i
            const squareColor = (i & 1) === 0 ? 'black' : 'white'
            const fieldClass = `square ${squareColor}`
            const point = this.indexToPoint(index)
            const squareRect = Svg.addElement(boardGroup, "rect", {
                x: point.x, y: point.y, width: this.squareWidth, height: this.squareHeight
            })
            squareRect.setAttribute("class", fieldClass)
            squareRect.setAttribute("data-index", "" + index)
        }
    }
    
    drawCoordinates() {
        if (!this.chessboard.props.style.showCoordinates) {
            return
        }
        while (this.coordinatesGroup.firstChild) {
            this.coordinatesGroup.removeChild(this.coordinatesGroup.lastChild)
        }
        const inline = this.chessboard.props.style.borderType !== BORDER_TYPE.frame
        for (let file = 0; file < 3; file++) {
            let x = this.borderSize + (17 + this.chessboard.props.sprite.size * file) * this.scalingX
            let y = this.height - this.scalingY * 3.5 - this.squareWidth
            let cssClass = "coordinate file"
            if (inline) {
                x = x + 2*this.squareWidth + this.scalingX * 15.5
                cssClass += (file+1) % 2 ? " white" : " black"
            }
            const textElement = Svg.addElement(this.coordinatesGroup, "text", {
                class: cssClass,
                x: x,
                y: y,
                style: `font-size: ${this.scalingY * 10}px`
            })
            if (this.chessboard.state.orientation === COLOR.white) {
                textElement.textContent = String.fromCharCode(97 + file)
            } else {
                textElement.textContent = String.fromCharCode(104 - file)
            }
        }
        for (let rank = 0; rank < 4; rank++) {
            let x = (this.borderSize / 3.7)
            let y = this.borderSize + 25 * this.scalingY + rank * this.squareHeight
            let cssClass = "coordinate rank"
            if (inline) {
                cssClass += (rank+1) % 2 ? " black" : " white"
                if (this.chessboard.props.style.borderType === BORDER_TYPE.frame) {
                    x = x + this.squareWidth * 2 + this.scalingX * 10
                    y = y - this.scalingY * 15 + this.squareHeight
                } else {
                    x = x + this.squareWidth * 2 + this.scalingX * 2
                    y = y - this.scalingY * 15 + this.squareHeight
                }
            }
            const textElement = Svg.addElement(this.coordinatesGroup, "text", {
                class: cssClass,
                x: x,
                y: y,
                style: `font-size: ${this.scalingY * 10}px`
            })
            if (this.chessboard.state.orientation === COLOR.white) {
                textElement.textContent = "" + (4 - rank)
            } else {
                textElement.textContent = "" + (1 + rank)
            }
        }
    }

    // Pieces //

    drawPieces(squares = this.chessboard.state.squares) {
        const childNodes = Array.from(this.piecesGroup.childNodes)
        for (let i = 0; i < 7+12+7; i++) {
            const pieceName = squares[i]
            if (pieceName) {
                this.drawPiece(i, pieceName)
            }
        }
        for (const childNode of childNodes) {
            this.piecesGroup.removeChild(childNode)
        }
    }

    drawPiece(index, pieceName) {
        const pieceGroup = Svg.addElement(this.piecesGroup, "g")
        pieceGroup.setAttribute("data-piece", pieceName)
        pieceGroup.setAttribute("data-index", index)
        const point = this.indexToPoint(index)
        const transform = (this.board_svg.createSVGTransform())
        transform.setTranslate(point.x, point.y)
        pieceGroup.transform.baseVal.appendItem(transform)
        const spriteUrl = this.chessboard.props.sprite.cache ? "" : this.chessboard.props.sprite.url
        const pieceUse = Svg.addElement(pieceGroup, "use", {
            href: `${spriteUrl}#${pieceName}`,
            class: "piece"
        })
        // center on square
        const transformTranslate = (this.board_svg.createSVGTransform())
        transformTranslate.setTranslate(this.pieceXTranslate, 0)
        pieceUse.transform.baseVal.appendItem(transformTranslate)
        // scale
        const transformScale = (this.board_svg.createSVGTransform())
        transformScale.setScale(this.scalingY, this.scalingY)
        pieceUse.transform.baseVal.appendItem(transformScale)
        return pieceGroup
    }

    setPieceVisibility(index, visible = true) {
        const piece = this.getPiece(index)
        if (visible) {
            piece.setAttribute("visibility", "visible")
        } else {
            piece.setAttribute("visibility", "hidden")
        }

    }

    getPiece(index) {
        return this.piecesGroup.querySelector(`g[data-index='${index}']`)
    }

    // Markers //

    drawMarkers() {
        while (this.markersGroup.firstChild) {
            this.markersGroup.removeChild(this.markersGroup.firstChild)
        }
        this.chessboard.state.markers.forEach((marker) => {
                this.drawMarker(marker)
            }
        )
    }

    drawMarker(marker) {
        const markerGroup = Svg.addElement(this.markersGroup, "g")
        markerGroup.setAttribute("data-index", marker.index)
        const point = this.indexToPoint(marker.index)
        const transform = (this.board_svg.createSVGTransform())
        transform.setTranslate(point.x, point.y)
        markerGroup.transform.baseVal.appendItem(transform)
        const spriteUrl = this.chessboard.props.sprite.cache ? "" : this.chessboard.props.sprite.url
        const markerUse = Svg.addElement(markerGroup, "use",
            {href: `${spriteUrl}#${marker.type.slice}`, class: "marker " + marker.type.class})
        const transformScale = (this.board_svg.createSVGTransform())
        transformScale.setScale(this.scalingX, this.scalingY)
        markerUse.transform.baseVal.appendItem(transformScale)
        return markerGroup
    }

    // animation queue //

    animatePieces(fromSquares, toSquares, callback) {
        this.animationQueue.push({fromSquares: fromSquares, toSquares: toSquares, callback: callback})
        if (!this.animationRunning) {
            this.nextPieceAnimationInQueue()
        }
    }

    nextPieceAnimationInQueue() {
        const nextAnimation = this.animationQueue.shift()
        if (nextAnimation !== undefined) {
            this.animationRunning = true
            this.currentAnimation = new ChessboardPiecesAnimation(this, nextAnimation.fromSquares, nextAnimation.toSquares, this.chessboard.props.animationDuration / (this.animationQueue.length + 1), () => {
                if (!this.moveInput.draggablePiece) {
                    this.drawPieces(nextAnimation.toSquares)
                    this.animationRunning = false
                    this.nextPieceAnimationInQueue()
                    if (nextAnimation.callback) {
                        nextAnimation.callback()
                    }
                } else {
                    this.animationRunning = false
                    this.nextPieceAnimationInQueue()
                    if (nextAnimation.callback) {
                        nextAnimation.callback()
                    }
                }
            })
        }
    }

    // enable and disable move input //

    enableMoveInput(eventHandler, color = undefined) {
        if (color === COLOR.white) {
            this.chessboard.state.inputWhiteEnabled = true
        } else if (color === COLOR.black) {
            this.chessboard.state.inputBlackEnabled = true
        } else {
            this.chessboard.state.inputWhiteEnabled = true
            this.chessboard.state.inputBlackEnabled = true
        }
        this.chessboard.state.inputEnabled = true
        this.moveInputCallback = eventHandler
        this.setCursor()
    }

    disableMoveInput() {
        this.chessboard.state.inputWhiteEnabled = false
        this.chessboard.state.inputBlackEnabled = false
        this.chessboard.state.inputEnabled = false
        this.moveInputCallback = undefined
        this.setCursor()
    }

    // callbacks //

    moveStartCallback(index) {
        if (this.moveInputCallback) {
            return this.moveInputCallback({
                chessboard: this.chessboard,
                type: INPUT_EVENT_TYPE.moveStart,
                square: SQUARE_COORDINATES[index]
            })
        } else {
            return true
        }
    }

    moveDoneCallback(fromIndex, toIndex) {
        if (this.moveInputCallback) {
            return this.moveInputCallback({
                chessboard: this.chessboard,
                type: INPUT_EVENT_TYPE.moveDone,
                squareFrom: SQUARE_COORDINATES[fromIndex],
                squareTo: SQUARE_COORDINATES[toIndex]
            })
        } else {
            return true
        }
    }

    moveCanceledCallback(reason, fromIndex, toIndex) {
        if (this.moveInputCallback) {
            this.moveInputCallback({
                chessboard: this.chessboard,
                type: INPUT_EVENT_TYPE.moveCanceled,
                reason: reason,
                squareFrom: SQUARE_COORDINATES[fromIndex],
                squareTo: toIndex ? SQUARE_COORDINATES[toIndex] : undefined
            })
        }
    }

    // Helpers //

    setCursor() {
        if (this.chessboard.state) { // fix https://github.com/shaack/cm-chessboard/issues/47
            if (this.chessboard.state.inputWhiteEnabled || this.chessboard.state.inputBlackEnabled || this.chessboard.state.squareSelectEnabled) {
                this.boardGroup.setAttribute("class", "board input-enabled")
            } else {
                this.boardGroup.setAttribute("class", "board")
            }
        }
    }

    indexToPoint(index) {
        if(index >= 7 && index < 7+12) {
            return this.squareIndexToPoint(index)
        } else {
            return this.resIndexToPoint(index)
        }
    }

    squareIndexToPoint(index) {
        let x, y
        index = index-7
        if (this.chessboard.state.orientation === COLOR.white) {
            x = this.borderSize + (2 + index % 3) * this.squareWidth
            y = this.borderSize + (1 + 3 - Math.floor(index / 3)) * this.squareHeight
        } else {
            x = this.borderSize + (2 + 3 - index % 3) * this.squareWidth
            y = this.borderSize + (1 + Math.floor(index / 3)) * this.squareHeight
        }
        return {x: x, y: y}
    }

    resIndexToPoint(index) {
        let x, y
        if (this.chessboard.state.orientation === COLOR.white) {
            x = this.borderSize + (index % (12+7)) * this.squareWidth
            y = this.borderSize + (index < 7 ? 5 : 0) * this.squareHeight
        } else {
            x = this.borderSize + (index % (12+7)) * this.squareWidth
            y = this.borderSize + (index < 7 ? 5 : 0) * this.squareHeight
        }
        return {x: x, y: y}
    }

}

const SVG_NAMESPACE = "http://www.w3.org/2000/svg"

export class Svg {

    /**
     * create the Svg in the HTML DOM
     * @param containerElement
     * @returns {Element}
     */
    static createSvg(containerElement = undefined) {
        let svg = document.createElementNS(SVG_NAMESPACE, "svg")
        if (containerElement) {
            svg.setAttribute("width", "100%")
            svg.setAttribute("height", "100%")
            containerElement.appendChild(svg)
        }
        return svg
    }

    /**
     * Add an Element to a SVG DOM
     * @param parent
     * @param name
     * @param attributes
     * @returns {Element}
     */
    static addElement(parent, name, attributes) {
        let element = document.createElementNS(SVG_NAMESPACE, name)
        if (name === "use") {
            attributes["xlink:href"] = attributes["href"] // fix for safari
        }
        for (let attribute in attributes) {
            if (attributes.hasOwnProperty(attribute)) {
                if (attribute.indexOf(":") !== -1) {
                    const value = attribute.split(":")
                    element.setAttributeNS("http://www.w3.org/1999/" + value[0], value[1], attributes[attribute])
                } else {
                    element.setAttribute(attribute, attributes[attribute])
                }
            }
        }
        parent.appendChild(element)
        return element
    }

    /**
     * Remove an Element from a SVG DOM
     * @param element
     */
    static removeElement(element) {
        element.parentNode.removeChild(element)
    }

}
