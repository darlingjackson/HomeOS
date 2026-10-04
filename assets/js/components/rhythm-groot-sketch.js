/* ============================================================
   HOMEOS // RHYTHM BUDDY SKETCH

   Processing.js drawing and animation used by rhythm-companion.js.
============================================================ */
var sketchProc = function (processingInstance) {
    const p = processingInstance;

    p.size(600, 600);
    p.frameRate(60);
    p.textFont(p.createFont("Trebuchet MS"));
    p.smooth();

    let scene = null;

    p.mouseClicked = function () {
        if (!scene) return;
        scene.clicked = true;
    };

    p.mouseOut = function () {
        if (!scene) return;
        scene.over = false;
    };

    p.mouseMoved = function () {
        if (!scene) return;

        scene.over = true;

        if (scene.idle) {
            scene.idle.time = p.millis();
        }

        if (scene.idle && scene.idle.active) {
            if (scene.groot) {
                scene.groot.action = scene.idle.action;
            }

            if (scene.action) {
                scene.action.active = true;
                scene.action.timer = 240;
            }

            scene.talkTimer = 50;

            if (typeof scene.updateActionButtons === "function") {
                scene.updateActionButtons();
            }

            scene.idle.active = false;
        }
    };

    // --- Source controls + drawing helpers ---
    var Button = (function () {
        var Button = function (args) {
            this.x = args.x;
            this.y = args.y;
            this.w = args.w || 75;
            this.h = args.h || 35;
            this.content = args.content;
            this.textSize = args.textSize || this.w * 0.18;
            this.enabled = true;
            this.hover = false;
            this.selected = args.selected || false;
            this.func = args.func;
            this.backColor = args.backColor || p.color(240);
            this.textColor = p.color(25);
        };
        Button.prototype = {
            over: function () {
                return (p.mouseX > this.x &&
                    p.mouseX < this.x + this.w &&
                    p.mouseY > this.y &&
                    p.mouseY < this.y + this.h);
            },
            draw: function () {
                p.noStroke();
                this.hover = this.over();
                if (this.enabled && this.hover) {
                    scene.hover = true;
                }
                p.fill(this.backColor, this.selected ? 100 : this.enabled && this.hover ? 150 : 220);
                p.rect(this.x, this.y, this.w, this.h);
                p.pushStyle();
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(this.textSize);
                p.fill(this.enabled ? this.textColor : p.color(this.textColor, 100));
                p.text(this.content, this.x + this.w / 2, this.y + this.h / 2);
                p.popStyle();
                if (this.enabled && scene.clicked && this.hover) {
                    this.func();
                }
            }
        };
        return Button;
    })();
    // --- Buddy drawing ---
    var Groot = (function () {
        var Groot = function () {
            this.themes = {
                summer: {
                    colors: {
                        outline: p.color(61, 38, 37),
                        dark: p.color(94, 132, 82),
                        medium: p.color(120, 159, 97),
                        light: p.color(151, 184, 126)
                    },
                    images: {
                        leafRight: undefined,
                        leafLeft: undefined
                    }
                },
                fall: {
                    colors: {
                        outline: p.color(76, 49, 42),
                        dark: p.color(103, 63, 48),
                        medium: p.color(173, 119, 88),
                        light: p.color(229, 191, 177)
                    },
                    images: {
                        leafRight: undefined,
                        leafLeft: undefined
                    }
                },
                winter: {
                    colors: {
                        outline: p.color(61, 38, 37),
                        dark: p.color(82, 122, 130),
                        medium: p.color(98, 153, 158),
                        light: p.color(127, 178, 184)
                    },
                    images: {
                        leafRight: undefined,
                        leafLeft: undefined
                    }
                },
                spring: {
                    colors: {
                        outline: p.color(61, 38, 37),
                        dark: p.color(94, 132, 82),
                        medium: p.color(120, 159, 97),
                        light: p.color(151, 184, 126)
                    },
                    images: {
                        leafRight: undefined,
                        leafLeft: undefined
                    }
                }
            };
            this.theme = this.themes.summer;
            this.colors = {
                outline: p.color(62, 39, 38),
                dark: p.color(144, 110, 76),
                medium: p.color(169, 135, 87),
                light: p.color(192, 174, 135),
            };
            // Keep the planter ivory so the seasonal color stays in the foliage.
            this.potColors = {
                outline: p.color(107, 82, 70),
                dark: p.color(198, 176, 146),
                medium: p.color(222, 205, 176),
                light: p.color(244, 235, 216)
            };
            this.character = "none";
            this.coords = {
                body: {
                    offset: 0
                },
                face: {
                    offset: 0,
                    angle: 0
                },
                arms: {
                    left: {
                        x1: 0,
                        y1: 0,
                        x2: 0,
                        y2: 0,
                        x3: 0,
                        y3: 0,
                        x4: 0,
                        y4: 0
                    },
                    right: {
                        x1: 0,
                        y1: 0,
                        x2: 0,
                        y2: 0,
                        x3: 0,
                        y3: 0,
                        x4: 0,
                        y4: 0
                    }
                },
                mouth: {
                    x1: 0, // left side
                    y1: 0, // left side
                    x2: 0, // bottom control point 1
                    y2: 0, // bottom control point 1
                    x3: 0, // bottom control point 2
                    y3: 0, // bottom control point 2
                    x4: 0, // right side
                    y4: 0, // right side
                    x5: 0, // top control point 1
                    y5: 0, // top control point 1
                    x6: 0, // top control point 2
                    y6: 0 // top control point 2
                },
                leaves: [
                    //head from left to right
                    {
                        scale: 1,
                        scaleMax: 1,
                    },
                    {
                        scale: 1,
                        scaleMax: 1,
                    },
                    {
                        scale: 1,
                        scaleMax: 1,
                    },
                    {
                        scale: 1,
                        scaleMax: 1,
                    },
                    {
                        scale: 1,
                        scaleMax: 1,
                    },
                    {
                        scale: 1,
                        scaleMax: 1,
                    },
                    //right arm
                    {
                        scale: 0.85,
                        scaleMax: 0.85,
                    },
                    //left arm from left to right
                    {
                        scale: 0.9,
                        scaleMax: 0.9,
                    },
                    {
                        scale: 0.9,
                        scaleMax: 0.9,
                    }
                ],
                flowers: [
                    //head from left to right
                    {
                        scale: 0,
                        scaleMax: 0.5,
                    },
                    {
                        scale: 0,
                        scaleMax: 0.5,
                    },
                    {
                        scale: 0,
                        scaleMax: 0.5,
                    },
                    //left hand
                    {
                        scale: 0,
                        scaleMax: 0.5,
                    }
                ],
                sticks: [
                    //head from left to right
                    {
                        scale: 0,
                        scaleMax: 0.5,
                    },
                    {
                        scale: 0,
                        scaleMax: 0.5,
                    },
                    {
                        scale: 0,
                        scaleMax: 0.5,
                    },
                    //left hand
                    {
                        scale: 0,
                        scaleMax: 0.5,
                    }
                ],
                snow: [
                    //head from left to right
                    {
                        x: 230,
                        y: 175,
                        diameter: 40,
                        opacity: 0
                    },
                    {
                        x: 280,
                        y: 160,
                        diameter: 30,
                        opacity: 0
                    },
                    {
                        x: 330,
                        y: 150,
                        diameter: 40,
                        opacity: 0
                    },
                    {
                        x: 370,
                        y: 195,
                        diameter: 25,
                        opacity: 0
                    }
                ]
            };
            this.action = "idle";
            this.idle = true;
            this.active = false;
            this.blink = {
                active: false,
                timer: 0,
                value: 0
            };
            this.eyeClose = 0;
            this.vel = 4;
            this.images = {};
            this.setup();
        };
        Groot.prototype = {
            setup: function () {
                //setup images
                // summer/spring leaf image
                p.pushStyle();
                p.background(0, 0);
                //main
                p.noStroke();
                p.fill(this.themes.summer.colors.outline);
                p.beginShape();
                p.vertex(195, 211);
                p.bezierVertex(224, 184, 215, 148, 192, 138);
                p.bezierVertex(170, 152, 164, 184, 195, 211);
                p.endShape(p.CLOSE);
                //inner full
                p.fill(this.themes.summer.colors.medium);
                p.beginShape();
                p.vertex(194, 204);
                p.bezierVertex(216, 181, 210, 161, 193, 144);
                p.bezierVertex(174, 162, 175, 182, 194, 204);
                p.endShape(p.CLOSE);
                //inner half
                p.fill(this.themes.summer.colors.dark);
                p.beginShape();
                p.vertex(194, 204);
                p.bezierVertex(216, 181, 210, 161, 193, 144);
                p.bezierVertex(199, 168, 198, 184, 194, 199);
                p.endShape(p.CLOSE);
                //line on leaf
                p.noFill();
                p.stroke(this.themes.summer.colors.outline);
                p.strokeWeight(1);
                p.bezier(198, 174, 198, 181, 198, 189, 194, 204);
                p.popStyle();
                // get image of the leaf
                this.images.leafRight = p.get(170, 135, 45, 78);
                p.background(0, 0);
                p.pushMatrix();
                p.translate(45, 0);
                p.scale(-1, 1);
                p.image(this.images.leafRight, 0, 0);
                p.popMatrix();
                this.images.leafLeft = p.get(0, 0, 45, 78);
                // autumn leaf image
                p.pushStyle();
                p.background(0, 0);
                //main
                p.noStroke();
                p.fill(this.themes.fall.colors.outline);
                p.beginShape();
                p.vertex(195, 211);
                p.bezierVertex(224, 184, 215, 148, 192, 138);
                p.bezierVertex(170, 152, 164, 184, 195, 211);
                p.endShape(p.CLOSE);
                //inner full
                p.fill(this.themes.fall.colors.medium);
                p.beginShape();
                p.vertex(194, 204);
                p.bezierVertex(216, 181, 210, 161, 193, 144);
                p.bezierVertex(174, 162, 175, 182, 194, 204);
                p.endShape(p.CLOSE);
                //inner half
                p.fill(this.themes.fall.colors.dark);
                p.beginShape();
                p.vertex(194, 204);
                p.bezierVertex(216, 181, 210, 161, 193, 144);
                p.bezierVertex(199, 168, 198, 184, 194, 199);
                p.endShape(p.CLOSE);
                //line on leaf
                p.noFill();
                p.stroke(this.themes.fall.colors.outline);
                p.strokeWeight(1);
                p.bezier(198, 174, 198, 181, 198, 189, 194, 204);
                p.popStyle();
                // get image of the leaf
                this.images.leafRightAutumn = p.get(170, 135, 45, 78);
                p.background(0, 0);
                p.pushMatrix();
                p.translate(45, 0);
                p.scale(-1, 1);
                p.image(this.images.leafRightAutumn, 0, 0);
                p.popMatrix();
                this.images.leafLeftAutumn = p.get(0, 0, 45, 78);
                this.themes.summer.images.leafRight = this.images.leafRight;
                this.themes.summer.images.leafLeft = this.images.leafLeft;
                this.themes.fall.images.leafRight = this.images.leafRightAutumn;
                this.themes.fall.images.leafLeft = this.images.leafLeftAutumn;
                this.themes.winter.images.leafRight = this.images.leafRightAutumn;
                this.themes.winter.images.leafLeft = this.images.leafLeftAutumn;
                this.themes.spring.images.leafRight = this.images.leafRight;
                this.themes.spring.images.leafLeft = this.images.leafLeft;
                //blossoms for spring
                p.background(0, 0);
                p.pushMatrix();
                p.translate(300, 300);
                p.noFill();
                p.stroke(177, 33, 83);
                p.strokeWeight(2);
                p.bezier(0, 0, -10, 35, 10, 65, 0, 100);
                p.noStroke();
                p.rotate(p.radians(5));
                for (var i = 0; i < 5; i++) {
                    p.rotate(p.radians(72));
                    p.fill(239, 180, 204);
                    p.ellipse(0, -20, 25, 60);
                    p.fill(177, 33, 83, p.random(150, 200));
                    p.ellipse(p.random(-7, 7), p.random(-20, -15), 4, 4);
                    p.ellipse(p.random(-7, 7), p.random(-20, -15), 4, 4);
                }
                p.fill(233, 110, 164);
                p.ellipse(0, 0, 30, 30);
                p.fill(177, 33, 83);
                p.ellipse(0, 0, 15, 15);
                p.popMatrix();
                this.images.blossom = p.get(251, 248, 99, 154);
                //stick image for winter
                p.background(0, 0);
                p.pushMatrix();
                p.translate(300, 300);
                // p.rotate(0);
                p.stroke(this.colors.outline);
                p.strokeWeight(8);
                p.line(0, 0, 0, -100);
                p.line(0, -40, 30, -55);
                p.line(0, -60, -20, -75);
                p.popMatrix();
                this.images.stick1 = p.get(276, 196, 57, 108);
                p.background(0, 0);
                p.pushMatrix();
                p.translate(300, 300);
                // p.rotate(0);
                p.stroke(this.colors.dark);
                p.strokeWeight(8);
                p.line(0, 0, 0, -100);
                p.line(0, -40, 30, -55);
                p.line(0, -60, -20, -75);
                p.popMatrix();
                this.images.stick2 = p.get(276, 196, 57, 108);
            },
            draw: function () {
                p.pushStyle();
                //shadow under pot
                p.noStroke();
                p.fill(40, 60);
                p.ellipse(287, 550, 200, 30);
                p.pushMatrix();
                p.translate(this.coords.body.offset / 2, 0);
                //leaves right arm
                var px = p.bezierPoint(292 + this.coords.arms.right.x1, 250 + this.coords.arms.right.x2, 210 + this.coords.arms.right.x3, 183 + this.coords.arms.right.x4, 1.0);
                var py = p.bezierPoint(373 + this.coords.arms.right.y1, 365 + this.coords.arms.right.y2, 370 + this.coords.arms.right.y3, 379 + this.coords.arms.right.y4, 1.0);
                p.pushMatrix();
                // p.translate(186 + 22, 301 + 78 + this.coords.body.offset / 2);
                p.translate(px, py + this.coords.body.offset / 2);
                p.rotate(p.radians(187 + this.coords.body.offset * 0.8));
                p.scale(this.coords.leaves[6].scale);
                p.translate(-22, -78);
                p.image(this.theme.images.leafLeft, 0, 0);
                p.popMatrix();
                //right arm
                p.noFill();
                p.stroke(this.colors.outline);
                p.strokeWeight(45);
                p.bezier(292 + this.coords.arms.right.x1, 373 + this.coords.arms.right.y1, 250 + this.coords.arms.right.x2, 365 + this.coords.arms.right.y2, 210 + this.coords.arms.right.x3, 370 + this.coords.arms.right.y3, 183 + this.coords.arms.right.x4, 379 + this.coords.arms.right.y4);
                p.stroke(this.colors.medium);
                p.strokeWeight(30);
                p.bezier(292 + this.coords.arms.right.x1, 373 + this.coords.arms.right.y1, 250 + this.coords.arms.right.x2, 365 + this.coords.arms.right.y2, 210 + this.coords.arms.right.x3, 370 + this.coords.arms.right.y3, 183 + this.coords.arms.right.x4, 379 + this.coords.arms.right.y4);
                //light line on arm
                p.stroke(this.colors.light);
                p.strokeWeight(3);
                p.bezier(292 + this.coords.arms.right.x1, 363 + this.coords.arms.right.y1, 250 + this.coords.arms.right.x2, 355 + this.coords.arms.right.y2, 210 + this.coords.arms.right.x3, 360 + this.coords.arms.right.y3, 183 + this.coords.arms.right.x4, 369 + this.coords.arms.right.y4);
                //leaves left arm
                var px = p.bezierPoint(309 + this.coords.arms.left.x1, 339 + this.coords.arms.left.x2, 376 + this.coords.arms.left.x3, 399 + this.coords.arms.left.x4, 1.0);
                var py = p.bezierPoint(378 - this.coords.arms.left.y1, 392 - this.coords.arms.left.y2, 396 - this.coords.arms.left.y3, 393 - this.coords.arms.left.y4, 1.0);
                //blossom
                p.pushMatrix();
                //99, 154
                p.translate(px, py - this.coords.body.offset / 2);
                p.rotate(p.radians(10 + this.coords.body.offset * 0.8));
                p.scale(this.coords.flowers[3].scale);
                p.translate(-45, -150);
                p.image(this.images.blossom, 0, 0);
                p.popMatrix();
                //stick
                p.pushMatrix();
                p.translate(px, py - this.coords.body.offset * 0.2);
                p.rotate(p.radians(10 + this.coords.body.offset * 0.8));
                p.scale(this.coords.sticks[3].scale);
                p.translate(-20, -130);
                p.image(this.images.stick1, 0, 0);
                p.popMatrix();
                //leaves
                p.pushMatrix();
                p.translate(px, py - this.coords.body.offset / 2);
                p.rotate(p.radians(45 + this.coords.body.offset * 0.8));
                p.scale(this.coords.leaves[7].scale);
                p.translate(-22, -78);
                p.image(this.theme.images.leafRight, 0, 0);
                p.popMatrix();
                p.pushMatrix();
                p.translate(px, py - this.coords.body.offset / 2);
                p.rotate(p.radians(-17 + this.coords.body.offset * 0.8));
                p.scale(this.coords.leaves[8].scale);
                p.translate(-22, -78);
                p.image(this.theme.images.leafLeft, 0, 0);
                p.popMatrix();
                //left arm
                p.noFill();
                p.stroke(this.colors.outline);
                p.strokeWeight(45);
                p.bezier(309 + this.coords.arms.left.x1, 378 - this.coords.arms.left.y1, 339 + this.coords.arms.left.x2, 392 - this.coords.arms.left.y2, 376 + this.coords.arms.left.x3, 396 - this.coords.arms.left.y3, 399 + this.coords.arms.left.x4, 393 - this.coords.arms.left.y4);
                p.stroke(this.colors.dark);
                p.strokeWeight(30);
                p.bezier(309 + this.coords.arms.left.x1, 378 - this.coords.arms.left.y1, 339 + this.coords.arms.left.x2, 392 - this.coords.arms.left.y2, 376 + this.coords.arms.left.x3, 396 - this.coords.arms.left.y3, 399 + this.coords.arms.left.x4, 393 - this.coords.arms.left.y4);
                p.strokeWeight(1);
                p.noStroke();
                p.popMatrix();
                //body
                //outline
                p.noStroke();
                p.fill(this.colors.outline);
                p.beginShape();
                p.vertex(262, 323);
                p.bezierVertex(264 + this.coords.body.offset, 382, 260 + this.coords.body.offset, 421, 256, 463);
                p.vertex(328, 463);
                p.bezierVertex(332 + this.coords.body.offset, 421, 334 + this.coords.body.offset, 382, 331, 323);
                p.endShape(p.CLOSE);
                //dark
                p.fill(this.colors.dark);
                p.beginShape();
                p.vertex(295, 323);
                p.bezierVertex(297 + this.coords.body.offset, 382, 293 + this.coords.body.offset, 421, 284, 463);
                p.vertex(318, 463);
                p.bezierVertex(322 + this.coords.body.offset, 421, 324 + this.coords.body.offset, 382, 321, 323);
                p.endShape(p.CLOSE);
                //medium
                p.fill(this.colors.medium);
                p.beginShape();
                p.vertex(272, 323);
                p.bezierVertex(274 + this.coords.body.offset, 382, 270 + this.coords.body.offset, 421, 266, 463);
                p.vertex(291, 463);
                p.bezierVertex(295 + this.coords.body.offset, 421, 299 + this.coords.body.offset, 382, 297, 323);
                p.endShape(p.CLOSE);
                //light
                p.stroke(this.colors.light);
                p.strokeWeight(3);
                p.noFill();
                p.bezier(272, 323, 274 + this.coords.body.offset, 382, 270 + this.coords.body.offset, 421, 266, 463);
                //translation of head section
                p.pushMatrix();
                p.translate(-5 + 300 + this.coords.face.offset / 2, 260);
                //need to bundle rotates up into single call
                p.rotate(p.radians(-4));
                p.rotate(p.radians(-this.coords.face.offset / 2));
                p.rotate(p.radians(this.coords.face.angle));
                p.translate(-300, -260);
                //flowers in spring
                p.pushMatrix();
                p.translate(205 + 17, 100 + 78);
                p.rotate(p.radians(-41 - this.coords.face.angle * 0.2));
                p.scale(this.coords.flowers[0].scale);
                p.translate(-45, -150);
                p.image(this.images.blossom, 0, 0);
                p.popMatrix();
                p.pushMatrix();
                p.translate(281 + 16, 83 + 74);
                p.rotate(p.radians(-7 - this.coords.face.angle * 0.2));
                p.scale(this.coords.flowers[1].scale);
                p.translate(-45, -150);
                p.image(this.images.blossom, 0, 0);
                p.popMatrix();
                p.pushMatrix();
                p.translate(375 + 21, 117 + 73);
                p.rotate(p.radians(63 - this.coords.face.angle * 0.2));
                p.scale(this.coords.flowers[2].scale);
                p.translate(-45, -150);
                p.image(this.images.blossom, 0, 0);
                p.popMatrix();
                //sticks in winter
                p.pushMatrix();
                p.translate(205 + 17, 100 + 78);
                p.rotate(p.radians(-41 - this.coords.face.angle * 0.2));
                p.scale(this.coords.sticks[3].scale);
                p.translate(5, -109);
                p.image(this.images.stick2, 0, 0);
                p.popMatrix();
                p.pushMatrix();
                p.translate(281 + 16, 83 + 74);
                p.rotate(p.radians(-7 - this.coords.face.angle * 0.2));
                p.scale(this.coords.sticks[3].scale);
                p.translate(5, -97);
                p.image(this.images.stick1, 0, 0);
                p.popMatrix();
                p.pushMatrix();
                p.translate(375 + 21, 117 + 73);
                p.rotate(p.radians(63 - this.coords.face.angle * 0.2));
                p.scale(this.coords.sticks[3].scale);
                p.translate(-7, -101);
                p.image(this.images.stick2, 0, 0);
                p.popMatrix();
                //leaves on head
                //right side
                p.pushMatrix();
                p.translate(205 + 22, 100 + 78);
                p.rotate(p.radians(-74 + this.coords.face.angle / 2));
                p.scale(this.coords.leaves[0].scale);
                p.translate(-22, -78);
                p.image(this.theme.images.leafLeft, 0, 0);
                p.popMatrix();
                p.pushMatrix();
                p.translate(205 + 22, 104 + 78);
                p.rotate(p.radians(-14 - this.coords.face.angle / 2));
                p.scale(this.coords.leaves[1].scale);
                p.translate(-22, -78);
                p.image(this.theme.images.leafRight, 0, 0);
                p.popMatrix();
                //center
                p.pushMatrix();
                p.translate(281 + 22, 83 + 78);
                p.rotate(p.radians(-36 + this.coords.face.angle / 2));
                p.scale(this.coords.leaves[2].scale);
                p.translate(-22, -78);
                p.image(this.theme.images.leafLeft, 0, 0);
                p.popMatrix();
                p.pushMatrix();
                p.translate(279 + 22, 83 + 78);
                p.rotate(p.radians(14 - this.coords.face.angle / 2));
                p.scale(this.coords.leaves[3].scale);
                p.translate(-22, -78);
                p.image(this.theme.images.leafRight, 0, 0);
                p.popMatrix();
                //left side
                p.pushMatrix();
                p.translate(375 + 22, 117 + 78);
                p.rotate(p.radians(26 + this.coords.face.angle / 2));
                p.scale(this.coords.leaves[4].scale);
                p.translate(-22, -78);
                p.image(this.theme.images.leafLeft, 0, 0);
                p.popMatrix();
                p.pushMatrix();
                p.translate(369 + 22, 110 + 78);
                p.rotate(p.radians(97 - this.coords.face.angle / 2));
                p.scale(this.coords.leaves[5].scale);
                p.translate(-22, -78);
                p.image(this.theme.images.leafRight, 0, 0);
                p.popMatrix();
                //head outline
                p.noStroke();
                p.fill(this.colors.outline);
                p.beginShape();
                p.vertex(217, 312);
                p.vertex(222, 278);
                p.vertex(204, 183);
                p.vertex(257, 137);
                p.vertex(267, 162);
                p.vertex(290, 167);
                p.vertex(295, 149);
                p.vertex(369, 127);
                p.vertex(363, 186);
                p.vertex(382, 192);
                p.vertex(395, 170);
                p.vertex(415, 210);
                p.vertex(389, 289);
                p.vertex(385, 326);
                p.bezierVertex(336, 380, 254, 365, 217, 312);
                p.endShape(p.CLOSE);
                //head inner
                p.fill(this.colors.dark);
                p.beginShape();
                p.vertex(231, 308);
                p.vertex(235, 281);
                p.vertex(218, 189);
                p.vertex(231, 175);
                p.vertex(244, 213);
                p.vertex(240, 166);
                p.vertex(250, 157);
                p.vertex(273, 220);
                p.vertex(270, 176);
                p.vertex(286, 178);
                p.vertex(296, 201);
                p.vertex(304, 164);
                p.vertex(337, 152);
                p.vertex(338, 188);
                p.vertex(345, 151);
                p.vertex(356, 146);
                p.vertex(346, 229);
                p.vertex(358, 200);
                p.vertex(381, 203);
                p.vertex(380, 216);
                p.vertex(392, 199);
                p.vertex(403, 216);
                p.vertex(377, 284);
                p.vertex(373, 322);
                p.bezierVertex(367, 329, 360, 334, 352, 338);
                p.vertex(353, 307);
                p.vertex(343, 343);
                p.vertex(336, 329);
                p.vertex(333, 345);
                p.bezierVertex(301, 352, 272, 344, 250, 329);
                p.vertex(251, 288);
                p.vertex(243, 322);
                p.bezierVertex(239, 319, 236, 315, 231, 308);
                p.endShape(p.CLOSE);
                //head - light shading
                p.fill(this.colors.medium);
                p.beginShape();
                p.vertex(231, 308);
                p.vertex(235, 281);
                p.vertex(218, 189);
                p.vertex(231, 175);
                p.vertex(245, 217);
                p.vertex(240, 166);
                p.vertex(247, 160);
                p.vertex(274, 222);
                p.vertex(270, 176);
                p.vertex(283, 178);
                p.vertex(296, 207);
                p.vertex(304, 164);
                p.vertex(324, 157);
                p.vertex(300 + this.coords.face.offset, 235);
                p.vertex(309 + this.coords.face.offset, 222);
                p.vertex(302 + this.coords.face.offset, 315);
                p.bezierVertex(288 + this.coords.face.offset, 330, 277 + this.coords.face.offset, 335, 266, 337);
                p.vertex(263, 317);
                p.vertex(255, 331);
                p.vertex(250, 328);
                p.vertex(251, 289);
                p.vertex(251, 288);
                p.vertex(243, 322);
                p.bezierVertex(239, 319, 236, 315, 231, 308);
                p.endShape();
                //head - light line on right side
                p.fill(this.colors.light);
                p.beginShape();
                p.vertex(235, 281);
                p.vertex(217, 189);
                p.vertex(231, 175);
                p.vertex(220, 191);
                p.bezierVertex(228, 224, 235, 258, 235, 281);
                p.endShape(p.CLOSE);
                //eyes
                p.fill(this.colors.light);
                p.ellipse(268 + this.coords.face.offset, 257, 33, 33);
                p.ellipse(346 + this.coords.face.offset, 266, 33, 33);
                p.fill(this.colors.outline);
                p.ellipse(266 + this.coords.face.offset, 258, 33, 33);
                p.ellipse(344 + this.coords.face.offset, 267, 33, 33);
                p.fill(this.colors.light);
                if (p.round(this.eyeClose) < 15) {
                    p.ellipse(271 + this.coords.face.offset, 252, 12, 12);
                    p.ellipse(349 + this.coords.face.offset, 261, 12, 12);
                }
                //eye actions
                if (this.action === "sleep") {
                    this.eyeClose = p.lerp(this.eyeClose, 16, 0.075);
                    //right eye
                    p.fill(this.colors.medium);
                    p.rect(248 + this.coords.face.offset, 239, 38, 2 + this.eyeClose);
                    p.rect(248 + this.coords.face.offset, 275 - this.eyeClose, 38, 2 + this.eyeClose);
                    //left eye
                    p.fill(this.colors.dark);
                    p.rect(326 + this.coords.face.offset, 248, 38, 2 + this.eyeClose);
                    p.rect(326 + this.coords.face.offset, 284 - this.eyeClose, 38, 2 + this.eyeClose);
                }
                else if (scene.homeosHealth === "dry" || scene.homeosHealth === "struggling") {
                    var tired = scene.homeosHealth === "dry" ? 11 : 6;
                    p.fill(this.colors.medium);
                    p.rect(248 + this.coords.face.offset, 239, 38, tired);
                    p.fill(this.colors.dark);
                    p.rect(326 + this.coords.face.offset, 248, 38, tired);
                }
                else if (this.blink.active) {
                    this.blink.timer++;
                    //right eye
                    p.fill(this.colors.medium);
                    p.rect(248 + this.coords.face.offset, 239, 38, 2 + p.abs(p.sin(p.radians(this.blink.timer * 10)) * 17));
                    p.rect(248 + this.coords.face.offset, 275 - p.abs(p.sin(p.radians(this.blink.timer * 10)) * 16), 38, 2 + p.abs(p.sin(p.radians(this.blink.timer * 10)) * 16));
                    //left eye
                    p.fill(this.colors.dark);
                    p.rect(326 + this.coords.face.offset, 249, 38, 2 + p.abs(p.sin(p.radians(this.blink.timer * 10)) * 17));
                    p.rect(326 + this.coords.face.offset, 283 - p.abs(p.sin(p.radians(this.blink.timer * 10)) * 16), 38, 2 + p.abs(p.sin(p.radians(this.blink.timer * 10)) * 16));
                }
                //mouth
                p.stroke(this.colors.outline);
                p.strokeWeight(6);
                p.noStroke();
                p.fill(this.colors.outline);
                p.beginShape();
                p.vertex(283 + this.coords.mouth.x1 + this.coords.face.offset, 301 + this.coords.mouth.y1);
                p.bezierVertex(295 + this.coords.mouth.x2 + this.coords.face.offset, 308 + this.coords.mouth.y2, 308 + this.coords.mouth.x3 + this.coords.face.offset, 308 + this.coords.mouth.y3, 320 + this.coords.mouth.x4 + this.coords.face.offset, 305 + this.coords.mouth.y4);
                p.vertex(320 + this.coords.mouth.x4 + this.coords.face.offset, 302 + this.coords.mouth.y4);
                p.bezierVertex(308 + this.coords.mouth.x5 + this.coords.face.offset, 304 + this.coords.mouth.y5, 295 + this.coords.mouth.x6 + this.coords.face.offset, 304 + this.coords.mouth.y6, 283 + this.coords.mouth.x1 + this.coords.face.offset, 298 + this.coords.mouth.y1);
                p.endShape(p.CLOSE);
                switch (this.character) {
                    case "pirate":
                        //patch on eye
                        p.stroke(this.colors.outline);
                        p.strokeWeight(3);
                        p.line(212, 219, 317 + this.coords.face.offset, 249);
                        p.line(358 + this.coords.face.offset, 255, 400, 252);
                        p.pushMatrix();
                        p.translate(9 + this.coords.face.offset, -7);
                        p.noStroke();
                        p.fill(this.colors.outline);
                        p.beginShape();
                        p.vertex(336, 239);
                        p.bezierVertex(352, 239, 364, 252, 365, 263);
                        p.bezierVertex(364, 283, 350, 294, 336, 294);
                        p.bezierVertex(322, 293, 306, 284, 307, 261);
                        p.bezierVertex(309, 247, 324, 239, 336, 239);
                        p.endShape(p.CLOSE);
                        p.popMatrix();
                        break;
                    case "star":
                        p.pushMatrix();
                        p.translate(10 + this.coords.face.offset, 0);
                        p.fill(168, 16, 168, 100);
                        p.stroke(120, 9, 120);
                        // p.stroke(this.colors.outline);
                        p.strokeWeight(5);
                        p.beginShape();
                        p.vertex(255, 221);
                        p.vertex(265, 242);
                        p.vertex(291, 246);
                        p.vertex(275, 264);
                        p.vertex(280, 286);
                        p.vertex(258, 280);
                        p.vertex(234, 289);
                        p.vertex(240, 266);
                        p.vertex(221, 249);
                        p.vertex(244, 244);
                        p.endShape(p.CLOSE);
                        p.beginShape();
                        p.vertex(342, 227);
                        p.vertex(349, 252);
                        p.vertex(373, 262);
                        p.vertex(353, 275);
                        p.vertex(351, 297);
                        p.vertex(333, 283);
                        p.vertex(309, 289);
                        p.vertex(317, 268);
                        p.vertex(304, 246);
                        p.vertex(329, 249);
                        p.endShape(p.CLOSE);
                        p.popMatrix();
                        break;
                    case "love":
                        p.pushMatrix();
                        p.translate(10 + this.coords.face.offset, 0);
                        p.fill(253, 165, 177, 50);
                        p.stroke(253, 165, 177, 200);
                        p.strokeWeight(4);
                        p.beginShape();
                        p.vertex(336, 244);
                        p.bezierVertex(345, 235, 360, 233, 366, 247);
                        p.bezierVertex(369, 268, 356, 288, 333, 295);
                        p.bezierVertex(306, 281, 300, 260, 306, 246);
                        p.bezierVertex(313, 235, 326, 234, 336, 244);
                        p.endShape(p.CLOSE);
                        p.beginShape();
                        p.vertex(259, 236);
                        p.bezierVertex(269, 227, 286, 227, 290, 246);
                        p.bezierVertex(289, 266, 273, 280, 256, 286);
                        p.bezierVertex(232, 274, 222, 258, 227, 238);
                        p.bezierVertex(233, 225, 248, 225, 259, 236);
                        p.endShape(p.CLOSE);
                        p.noFill();
                        p.strokeWeight(2);
                        p.line(206 - this.coords.face.offset, 246, 223, 243);
                        p.bezier(290, 245, 295, 241, 300, 242, 304, 246);
                        p.line(368, 252, 390 - this.coords.face.offset, 258);
                        p.popMatrix();
                        break;
                    case "ninja":
                        p.noFill();
                        p.stroke(this.colors.outline);
                        p.strokeWeight(10);
                        p.ellipse(266 + this.coords.face.offset, 258, 46, 46);
                        p.ellipse(344 + this.coords.face.offset, 267, 46, 46);
                        p.strokeWeight(1);
                        p.noStroke();
                        p.fill(this.colors.outline);
                        p.beginShape();
                        p.vertex(212, 225);
                        p.vertex(264 + this.coords.face.offset, 232);
                        p.bezierVertex(242 + this.coords.face.offset, 240, 239 + this.coords.face.offset, 255, 253 + this.coords.face.offset, 281);
                        p.vertex(222, 277);
                        p.endShape(p.CLOSE);
                        p.beginShape();
                        p.vertex(277 + this.coords.face.offset, 235);
                        p.vertex(341 + this.coords.face.offset, 241);
                        p.bezierVertex(318 + this.coords.face.offset, 257, 318 + this.coords.face.offset, 268, 333 + this.coords.face.offset, 292);
                        p.vertex(269 + this.coords.face.offset, 285);
                        p.bezierVertex(289 + this.coords.face.offset, 264, 291 + this.coords.face.offset, 255, 279 + this.coords.face.offset, 233);
                        p.endShape(p.CLOSE);
                        p.beginShape();
                        p.vertex(354 + this.coords.face.offset, 243);
                        p.vertex(403, 246);
                        p.vertex(390, 287);
                        p.vertex(358 + this.coords.face.offset, 290);
                        p.bezierVertex(369 + this.coords.face.offset, 273, 369 + this.coords.face.offset, 265, 354 + this.coords.face.offset, 243);
                        p.endShape(p.CLOSE);
                        break;
                    case "potter":
                        p.noFill();
                        p.stroke(this.colors.outline);
                        p.strokeWeight(5);
                        p.line(222, 243, 238 + this.coords.face.offset, 247);
                        p.line(297 + this.coords.face.offset, 254, 317 + this.coords.face.offset, 256);
                        p.line(370 + this.coords.face.offset, 259, 395, 258);
                        p.ellipse(266 + this.coords.face.offset, 258, 55, 55);
                        p.ellipse(344 + this.coords.face.offset, 267, 55, 55);
                        p.strokeWeight(2);
                        p.line(287, 202, 288, 212);
                        p.line(288, 212, 279, 207);
                        p.line(279, 207, 281, 219);
                        break;
                    case "pixel":
                        p.pushMatrix();
                        p.translate(305, 245);
                        p.rotate(p.radians(3));
                        p.translate(-305, -245);
                        p.translate(this.coords.face.offset, 3);
                        p.fill(this.colors.outline);
                        p.noStroke();
                        //top frame
                        p.rect(235, 240, 145, 7);
                        //left
                        p.rect(240, 246, 60, 10);
                        p.rect(245, 255, 50, 10);
                        p.rect(250, 261, 40, 10);
                        p.rect(255, 268, 30, 10);
                        //right
                        p.rect(315, 246, 60, 10);
                        p.rect(322, 255, 50, 10);
                        p.rect(327, 261, 40, 10);
                        p.rect(332, 268, 30, 10);
                        p.fill(225);
                        //left
                        p.rect(248, 246, 8, 8);
                        p.rect(253, 254, 8, 8);
                        p.rect(258, 262, 8, 8);
                        //right
                        p.rect(325, 246, 8, 8);
                        p.rect(330, 254, 8, 8);
                        p.rect(335, 262, 8, 8);
                        p.popMatrix();
                        break;
                }
                p.popMatrix();
                //pot
                //outline
                p.noStroke();
                p.fill(this.potColors.outline);
                p.beginShape();
                p.vertex(348, 440);
                p.bezierVertex(385, 438, 382, 482, 352, 489);
                p.bezierVertex(358, 505, 351, 535, 333, 548);
                p.bezierVertex(308, 550, 267, 550, 244, 548);
                p.bezierVertex(214, 538, 214, 507, 215, 487);
                p.bezierVertex(188, 476, 190, 445, 212, 440);
                p.endShape(p.CLOSE);
                //dark
                p.fill(this.potColors.dark);
                p.beginShape();
                p.vertex(346, 448);
                p.bezierVertex(367, 449, 366, 465, 359, 474);
                p.bezierVertex(345, 481, 326, 480, 309, 481);
                p.bezierVertex(329, 484, 344, 492, 343, 505);
                p.bezierVertex(341, 522, 335, 533, 331, 538);
                p.bezierVertex(299, 541, 264, 541, 245, 539);
                p.bezierVertex(227, 527, 223, 505, 223, 480);
                p.bezierVertex(201, 478, 198, 452, 210, 448);
                p.endShape(p.CLOSE);
                //medium
                p.fill(this.potColors.medium);
                p.beginShape();
                p.vertex(294, 449);
                p.bezierVertex(311, 449, 318, 456, 316, 467);
                p.bezierVertex(311, 475, 300, 476, 290, 478);
                p.bezierVertex(306, 492, 306, 522, 286, 540);
                p.bezierVertex(268, 540, 257, 540, 245, 538);
                p.bezierVertex(221, 522, 225, 498, 222, 480);
                p.bezierVertex(200, 472, 199, 453, 211, 449);
                p.endShape(p.CLOSE);
                //light
                p.fill(this.potColors.light);
                p.beginShape();
                p.vertex(275, 454);
                p.bezierVertex(284, 454, 292, 455, 294, 461);
                p.bezierVertex(295, 468, 285, 472, 275, 472);
                p.bezierVertex(256, 473, 243, 473, 227, 472);
                p.bezierVertex(214, 468, 213, 462, 213, 460);
                p.bezierVertex(215, 454, 224, 455, 241, 454);
                p.endShape(p.CLOSE);
                p.popStyle();
            },
            go: function () {
                this.draw();
            }
        };
        return Groot;
    })();
    // --- Scene + animation ---
    var Scene = (function () {
        var Scene = function () {
            this.clicked = false;
            this.hover = false;
            this.over = false;
            this.timer = 0;
            this.talkTimer = 0;
            this.ball = {
                timer: 0,
                left: false,
                right: false,
                type: 0
            };
            this.idle = {
                value: 0,
                time: p.millis(),
                duration: 15,
                active: false,
                //previous action to go back to
                action: "idle"
            };
            this.shake = 0;
            this.shakedown = 0.1;
            this.selectedColor = p.color(0);
            this.action = {
                active: false,
                timer: 0
            };
            // State controlled by rhythm-companion.js.
            this.homeosBloom = false;
            this.homeosHealth = "healthy";
            this.homeosPointer = { over: false, x: 300, y: 300 };
            this.homeosScheduleSleeping = false;
            this.words = [
                {
                    content: "HOME",
                    x: 300,
                    y: 330,
                    opacity: 0,
                    dir: 1,
                    active: false
                },
                {
                    content: "OS",
                    x: 300,
                    y: 360,
                    opacity: 0,
                    dir: 1,
                    active: false
                },
                {
                    content: "READY",
                    x: 300,
                    y: 390,
                    opacity: 0,
                    dir: 1,
                    active: false
                }
            ];
            this.themes = {
                summer: {
                    back: p.color(93, 200, 220, 240),
                    ground: p.color(94, 132, 82)
                },
                fall: {
                    back: p.color(68, 55, 55, 245),
                    ground: p.color(91, 62, 52)
                },
                winter: {
                    back: p.color(93, 200, 210, 150),
                    ground: p.color(250)
                },
                spring: {
                    back: p.color(160, 187, 58, 200),
                    ground: p.color(94, 132, 82)
                }
            };
            this.theme = this.themes.summer;
            this.groot = new Groot();
            this.zzzs = [];
            this.snows = [];
            this.balls = [];
            this.crumbs = [];
            this.explosions = [];
            this.cup = {
                x: 300,
                y: 380,
                w: 115,
                h: 170,
                colors: [
                    p.color(212, 56, 53), //red
                    p.color(65, 147, 156), //blue
                    p.color(209, 200, 75) //yellow
                ],
                color: p.color(212, 56, 53),
                total: 100 //how full the cup is in percentage
            };
            this.sun = {
                x: -150,
                y: -150,
                diameter: 300,
                colors: {
                    fill: p.color(225, 232, 90),
                    stroke: p.color(212, 217, 78)
                },
                opacity: 255
            };
            this.spots = [];
            this.spoon = {
                x: 400,
                y: 300,
                w: 80,
                h: 50,
                colors: {
                    dark: p.color(65, 150, 170),
                    medium: p.color(115, 200, 220),
                    light: p.color(170, 220, 230),
                    food: p.color(207, 126, 72)
                },
                enabled: false,
                hover: false
            };
            this.buttons = {
                actions: {
                    idle: new Button({
                        content: "Idle",
                        x: 525,
                        y: 20,
                        selected: true,
                        func: function () {
                            scene.groot.action = "idle";
                            scene.action.active = false;
                            scene.action.timer = 0;
                            scene.updateActionButtons();
                        }
                    }),
                    dance: new Button({
                        content: "Dance",
                        x: 525,
                        y: 60,
                        func: function () {
                            scene.groot.action = "dance";
                            scene.action.active = true;
                            scene.action.timer = 240;
                            scene.updateActionButtons();
                        }
                    }),
                    sleep: new Button({
                        content: "Sleep",
                        x: 525,
                        y: 100,
                        func: function () {
                            scene.groot.action = "sleep";
                            scene.action.active = true;
                            scene.action.timer = 240;
                            scene.updateActionButtons();
                        }
                    }),
                    wave: new Button({
                        content: "Wave",
                        x: 525,
                        y: 140,
                        func: function () {
                            scene.groot.action = "wave";
                            scene.action.active = true;
                            scene.action.timer = 240;
                            scene.updateActionButtons();
                        }
                    }),
                    eat: new Button({
                        content: "Eat",
                        x: 525,
                        y: 180,
                        func: function () {
                            scene.groot.action = "eat";
                            scene.action.active = true;
                            scene.action.timer = 240;
                            scene.spoon.x = p.mouseX;
                            scene.spoon.y = p.mouseY - 20;
                            scene.spoon.colors.food = p.color(p.random(150, 200), p.random(150, 200), p.random(150, 200));
                            scene.updateActionButtons();
                        }
                    }),
                    drink: new Button({
                        content: "Drink",
                        x: 525,
                        y: 220,
                        func: function () {
                            scene.groot.action = "drink";
                            scene.cup.x = -scene.cup.w;
                            scene.cup.color = scene.cup.colors[~~p.random(scene.cup.colors.length)];
                            scene.action.active = true;
                            scene.action.timer = 240;
                            // scene.idle.time = p.millis();
                            scene.updateActionButtons();
                        }
                    }),
                    talk: new Button({
                        content: "Talk",
                        x: 525,
                        y: 260,
                        func: function () {
                            scene.groot.action = "talk";
                            scene.action.active = true;
                            scene.action.timer = 240;
                            scene.talkTimer = 50;
                            scene.updateActionButtons();
                        }
                    }),
                    juggle: new Button({
                        content: "Juggle",
                        x: 525,
                        y: 300,
                        func: function () {
                            if (scene.groot.action !== "juggle") {
                                scene.setBalls();
                            }
                            scene.groot.action = "juggle";
                            scene.action.active = true;
                            scene.action.timer = 240;
                            scene.updateActionButtons();
                        }
                    })
                },
                juggles: {
                    balls: new Button({
                        content: "Balls",
                        x: 525,
                        y: 380,
                        selected: true,
                        func: function () {
                            scene.ball.type = 0;
                            scene.updateJuggleButtons("balls");
                        }
                    }),
                    knives: new Button({
                        content: "Knives",
                        x: 525,
                        y: 420,
                        func: function () {
                            scene.ball.type = 1;
                            scene.updateJuggleButtons("knives");
                        }
                    }),
                    stars: new Button({
                        content: "Stars",
                        x: 525,
                        y: 460,
                        func: function () {
                            scene.ball.type = 2;
                            scene.updateJuggleButtons("stars");
                        }
                    }),
                    cards: new Button({
                        content: "Cards",
                        x: 525,
                        y: 500,
                        func: function () {
                            scene.ball.type = 3;
                            scene.updateJuggleButtons("cards");
                        }
                    }),
                    penguins: new Button({
                        content: "Penguins",
                        x: 525,
                        y: 540,
                        func: function () {
                            scene.ball.type = 4;
                            scene.updateJuggleButtons("penguins");
                        }
                    })
                },
                themes: {
                    summer: new Button({
                        content: "Summer",
                        x: 0,
                        y: 20,
                        selected: true,
                        func: function () {
                            scene.theme = scene.themes.summer;
                            scene.groot.theme = scene.groot.themes.summer;
                            scene.updateThemeButtons("summer");
                        }
                    }),
                    fall: new Button({
                        content: "Fall",
                        x: 0,
                        y: 60,
                        func: function () {
                            scene.theme = scene.themes.fall;
                            scene.groot.theme = scene.groot.themes.fall;
                            scene.updateThemeButtons("fall");
                        }
                    }),
                    winter: new Button({
                        content: "Winter",
                        x: 0,
                        y: 100,
                        func: function () {
                            scene.theme = scene.themes.winter;
                            scene.groot.theme = scene.groot.themes.winter;
                            scene.updateThemeButtons("winter");
                        }
                    }),
                    spring: new Button({
                        content: "Spring",
                        x: 0,
                        y: 140,
                        func: function () {
                            scene.theme = scene.themes.spring;
                            scene.groot.theme = scene.groot.themes.spring;
                            scene.updateThemeButtons("spring");
                        }
                    })
                },
                characters: {
                    none: new Button({
                        content: "None",
                        x: 0,
                        y: 220,
                        selected: true,
                        func: function () {
                            scene.groot.character = "none";
                            scene.updateCharacterButtons("none");
                        }
                    }),
                    pirate: new Button({
                        content: "Pirate",
                        x: 0,
                        y: 260,
                        func: function () {
                            scene.groot.character = "pirate";
                            scene.updateCharacterButtons("pirate");
                        }
                    }),
                    ninja: new Button({
                        content: "Ninja",
                        x: 0,
                        y: 300,
                        func: function () {
                            scene.groot.character = "ninja";
                            scene.updateCharacterButtons("ninja");
                        }
                    }),
                    potter: new Button({
                        content: "Potter",
                        x: 0,
                        y: 340,
                        func: function () {
                            scene.groot.character = "potter";
                            scene.updateCharacterButtons("potter");
                        }
                    }),
                    star: new Button({
                        content: "Star",
                        x: 0,
                        y: 380,
                        func: function () {
                            scene.groot.character = "star";
                            scene.updateCharacterButtons("star");
                        }
                    }),
                    love: new Button({
                        content: "Love",
                        x: 0,
                        y: 420,
                        func: function () {
                            scene.groot.character = "love";
                            scene.updateCharacterButtons("love");
                        }
                    }),
                    pixel: new Button({
                        content: "Pixel",
                        x: 0,
                        y: 460,
                        func: function () {
                            scene.groot.character = "pixel";
                            scene.updateCharacterButtons("pixel");
                        }
                    })
                }
            };
            this.init();
        };
        Scene.prototype = {
            init: function () {
                for (var i = 0; i < 3; i++) {
                    this.balls.push({
                        x: 0,
                        y: 0,
                        diameter: 40,
                        vx: -1.4,
                        vy: 0,
                        delay: i * 240,
                        timer: 0,
                        gravity: 0.25,
                        color: p.color(p.random(180, 240), p.random(180, 240), p.random(180, 240)),
                        opacity: 255,
                        active: false,
                        started: false,
                        type: 0,
                        angle: 0,
                        angleDir: 1
                    });
                }
            },
            collisionColor: function (clr) {
                for (var property in this.groot.colors) {
                    if (clr === this.groot.colors[property]) {
                        this.selectedColor = p.color(clr);
                        return true;
                    }
                }
                return false;
            },
            shakeScreen: function () {
                if (this.shake > 0) {
                    this.shake = p.lerp(this.shake, 0, this.shakedown);
                    p.translate(p.round(p.random(-this.shake, this.shake)), p.round(p.random(-this.shake, this.shake)));
                }
            },
            runZs: function () {
                if (this.zzzs.length > 0) {
                    p.pushStyle();
                    p.textAlign(p.CENTER, p.CENTER);
                    for (var i = this.zzzs.length - 1; i >= 0; i--) {
                        var z = this.zzzs[i];
                        p.pushMatrix();
                        p.translate(z.x, z.y);
                        p.rotate(p.radians(p.frameCount * 2));
                        p.fill(0, z.opacity);
                        p.textSize(z.size);
                        p.text("Z", 0, 0);
                        z.opacity -= 2;
                        z.y -= 2;
                        if (z.opacity <= 0) {
                            this.zzzs.splice(i, 1);
                        }
                        p.popMatrix();
                    }
                    p.popStyle();
                }
            },
            setBalls: function () {
                //set the initial params for each ball
                for (var i = 0; i < this.balls.length; i++) {
                    var ball = this.balls[i];
                    ball.opacity = 50;
                    ball.color = p.color(p.random(180, 240), p.random(180, 240), p.random(180, 240));
                    ball.x = 183;
                    ball.y = 379;
                    ball.vx = -2.3;
                    ball.vy = 0;
                    ball.delay = 30 + (i * 60);
                    ball.timer = 0;
                    ball.active = false;
                    ball.started = false;
                    ball.angle = 0;
                    ball.angleDir = -1;
                }
                this.ball.timer = 0;
            },
            runBalls: function () {
                if (this.groot.action === "juggle") {
                    this.ball.timer++;
                    //run through each ball
                    p.noStroke();
                    for (var i = 0; i < this.balls.length; i++) {
                        var ball = this.balls[i];
                        if (ball.active) {
                            //fade in the balls
                            switch (this.ball.type) {
                                case 0:
                                    ball.opacity = p.constrain(ball.opacity + 5, 0, 255);
                                    p.stroke(this.groot.colors.outline, ball.opacity);
                                    p.strokeWeight(4);
                                    p.fill(ball.color, ball.opacity);
                                    p.ellipse(ball.x, ball.y, ball.diameter, ball.diameter);
                                    break;
                                case 1:
                                    ball.opacity = p.constrain(ball.opacity + 5, 0, 255);
                                    p.pushMatrix();
                                    ball.w = 37;
                                    ball.h = 67;
                                    p.translate(ball.x, ball.y);
                                    ball.angle += 5 * ball.angleDir;
                                    p.rotate(p.radians(ball.angle));
                                    //blade
                                    p.noStroke();
                                    p.fill(200, 200, 200);
                                    p.beginShape();
                                    p.vertex(-ball.w * 0.25, -ball.h * 0.2);
                                    p.vertex(ball.w * 0.25, -ball.h * 0.2);
                                    p.bezierVertex(ball.w * 0.25, ball.h * 0.3, ball.w * 0.1, ball.h * 0.5, 0, ball.h * 0.65);
                                    p.bezierVertex(-ball.w * 0.1, ball.h * 0.5, -ball.w * 0.25, ball.h * 0.3, -ball.w * 0.25, -ball.h * 0.2);
                                    p.endShape(p.CLOSE);
                                    //cuff
                                    p.stroke(100);
                                    p.strokeWeight(2);
                                    p.line(-ball.w * 0.6, -ball.h * 0.2, ball.w * 0.6, -ball.h * 0.2);
                                    //handle
                                    p.noStroke();
                                    p.fill(100);
                                    p.beginShape();
                                    p.vertex(-ball.w * 0.2, -ball.h * 0.2);
                                    p.vertex(-ball.w * 0.2, -ball.h * 0.55);
                                    p.vertex(ball.w * 0.2, -ball.h * 0.55);
                                    p.vertex(ball.w * 0.2, -ball.h * 0.2);
                                    p.endShape(p.CLOSE);
                                    p.popMatrix();
                                    break;
                                case 2:
                                    p.pushMatrix();
                                    ball.w = 30;
                                    ball.h = 30;
                                    p.translate(ball.x, ball.y);
                                    ball.angle += 5 * ball.angleDir;
                                    p.rotate(p.radians(ball.angle));
                                    //star
                                    p.fill(i === 0 ? this.groot.theme.colors.dark :
                                        i === 1 ? this.groot.theme.colors.medium :
                                            this.groot.theme.colors.light);
                                    p.stroke(255);
                                    p.strokeWeight(2);
                                    p.beginShape();
                                    p.vertex(0, -ball.h);
                                    p.vertex(ball.w * 0.3, -ball.h * 0.4);
                                    p.vertex(ball.w * 0.9, -ball.h * 0.3);
                                    p.vertex(ball.w * 0.5, ball.h * 0.15);
                                    p.vertex(ball.w * 0.6, ball.h * 0.8);
                                    p.vertex(0, ball.h * 0.5);
                                    p.vertex(-ball.w * 0.6, ball.h * 0.8);
                                    p.vertex(-ball.w * 0.5, ball.h * 0.15);
                                    p.vertex(-ball.w * 0.9, -ball.h * 0.3);
                                    p.vertex(-ball.w * 0.3, -ball.h * 0.4);
                                    p.endShape(p.CLOSE);
                                    p.popMatrix();
                                    break;
                                case 3:
                                    p.pushMatrix();
                                    p.pushStyle();
                                    ball.w = 36;
                                    ball.h = 48;
                                    p.translate(ball.x, ball.y);
                                    ball.angle += 5 * ball.angleDir;
                                    p.rotate(p.radians(ball.angle));
                                    p.noStroke();
                                    p.fill(250, 250, 250);
                                    p.rectMode(p.CENTER);
                                    p.rect(0, 0, ball.w, ball.h);
                                    p.scale(0.35);
                                    p.textSize(30);
                                    p.fill(255, 0, 0);
                                    p.text("A", -ball.w * 1.25, -ball.h * 0.7);
                                    p.translate(0, ball.h * 0.2);
                                    p.beginShape();
                                    p.vertex(0, -ball.h * 0.5);
                                    p.bezierVertex(-ball.w * 1.15, -ball.h * 0.85, -ball.w * 0.45, ball.h * 0.25, 0, ball.h * 0.5);
                                    p.bezierVertex(ball.w * 0.45, ball.h * 0.25, ball.w * 1.15, -ball.h * 0.85, 0, -ball.h * 0.5);
                                    p.endShape(p.CLOSE);
                                    p.rotate(p.radians(180));
                                    p.text("A", -ball.w * 1.25, -ball.h * 0.65);
                                    p.popStyle();
                                    p.popMatrix();
                                    break;
                                case 4:
                                    p.pushMatrix();
                                    ball.w = 45;
                                    ball.h = 45;
                                    p.translate(ball.x, ball.y);
                                    ball.angle += 5 * ball.angleDir;
                                    p.rotate(p.radians(ball.angle));
                                    p.noStroke();
                                    //legs
                                    p.fill(243, 57, 0, 200);
                                    //left
                                    p.beginShape();
                                    p.vertex(ball.w * 0.1, ball.h * 0.48);
                                    p.vertex(ball.w * 0.12, ball.h * 0.65);
                                    p.bezierVertex(ball.w * 0.2, ball.h * 0.62, ball.w * 0.35, ball.h * 0.57, ball.w * 0.4, ball.h * 0.73);
                                    p.vertex(ball.w * 0.06, ball.h * 0.72);
                                    p.vertex(ball.w * 0.05, ball.h * 0.48);
                                    p.vertex(ball.w * 0.1, ball.h * 0.48);
                                    p.endShape();
                                    //right
                                    p.beginShape();
                                    p.vertex(-ball.w * 0.1, ball.h * 0.48);
                                    p.vertex(-ball.w * 0.12, ball.h * 0.65);
                                    p.bezierVertex(-ball.w * 0.2, ball.h * 0.62, -ball.w * 0.35, ball.h * 0.57, -ball.w * 0.4, ball.h * 0.72);
                                    p.vertex(-ball.w * 0.06, ball.h * 0.72);
                                    p.vertex(-ball.w * 0.05, ball.h * 0.48);
                                    p.vertex(-ball.w * 0.1, ball.h * 0.48);
                                    p.endShape();
                                    //body
                                    //outer
                                    p.fill(33, 33, 33);
                                    p.beginShape();
                                    p.vertex(0, -ball.h * 0.5);
                                    p.bezierVertex(-ball.w * 0.5, -ball.h * 0.5, -ball.w * 0.8, ball.h * 0.5, 0, ball.h * 0.5);
                                    p.bezierVertex(ball.w * 0.8, ball.h * 0.5, ball.w * 0.5, -ball.h * 0.5, 0, -ball.h * 0.5);
                                    p.endShape();
                                    //inner
                                    p.fill(250, 250, 250);
                                    p.beginShape();
                                    p.vertex(0, -ball.h * 0.45);
                                    p.bezierVertex(-ball.w * 0.45, -ball.h * 0.45, -ball.w * 0.65, ball.h * 0.45, 0, ball.h * 0.48);
                                    p.bezierVertex(ball.w * 0.65, ball.h * 0.48, ball.w * 0.45, -ball.h * 0.45, 0, -ball.h * 0.45);
                                    p.endShape();
                                    //arms
                                    //left
                                    p.fill(33, 33, 33);
                                    p.beginShape();
                                    p.vertex(-ball.w * 0.4, -ball.h * 0.23);
                                    p.bezierVertex(-ball.w * 0.6, -ball.h * 0.28, -ball.w * 0.53, -ball.h * 0.3, -ball.w * 0.6, -ball.h * 0.3);
                                    p.bezierVertex(-ball.w * 0.6, -ball.h * 0.15, -ball.w * 0.5, -ball.h * 0.08, -ball.w * 0.48, -ball.h * 0.05);
                                    p.vertex(-ball.w * 0.4, -ball.h * 0.23);
                                    p.endShape();
                                    //right
                                    p.beginShape();
                                    p.vertex(ball.w * 0.4, -ball.h * 0.23);
                                    p.bezierVertex(ball.w * 0.6, -ball.h * 0.28, ball.w * 0.53, -ball.h * 0.3, ball.w * 0.6, -ball.h * 0.3);
                                    p.bezierVertex(ball.w * 0.6, -ball.h * 0.15, ball.w * 0.5, -ball.h * 0.08, ball.w * 0.48, -ball.h * 0.05);
                                    p.vertex(ball.w * 0.4, -ball.h * 0.23);
                                    p.endShape();
                                    //eyes
                                    p.fill(33, 33, 33);
                                    p.ellipse(-ball.w * 0.12, -ball.h * 0.3, ball.w * 0.04, ball.h * 0.07);
                                    p.ellipse(ball.w * 0.12, -ball.h * 0.3, ball.w * 0.04, ball.h * 0.07);
                                    //beak
                                    p.fill(234, 156, 16);
                                    p.beginShape();
                                    p.vertex(ball.w * 0.1, -ball.h * 0.22);
                                    p.bezierVertex(ball.w * 0.05, -ball.h * 0.12, ball.w * 0.01, -ball.h * 0.12, 0, -ball.h * 0.12);
                                    p.bezierVertex(-ball.w * 0.01, -ball.h * 0.12, -ball.w * 0.05, -ball.h * 0.12, -ball.w * 0.1, -ball.h * 0.22);
                                    p.bezierVertex(-ball.w * 0.02, -ball.h * 0.25, ball.w * 0.02, -ball.h * 0.25, ball.w * 0.1, -ball.h * 0.22);
                                    p.endShape();
                                    //flush cheeks
                                    p.fill(232, 118, 161, 100);
                                    p.ellipse(-ball.w * 0.2, -ball.h * 0.2, ball.w / 12, ball.h / 12);
                                    p.ellipse(ball.w * 0.2, -ball.h * 0.2, ball.w / 12, ball.h / 12);
                                    p.popMatrix();
                                    break;
                            }
                            ball.x += ball.vx;
                            if (ball.y === 379) {
                                ball.angleDir *= -1;
                                ball.vy = 0;
                                if (ball.vx > 0) {
                                    this.ball.left = true;
                                }
                                else {
                                    this.ball.right = true;
                                }
                            }
                            if (ball.timer === 0 || ball.timer % 95 === 0) {
                                ball.vy += -12;
                                ball.vx = -ball.vx;
                            }
                            ball.timer++;
                            ball.vy += ball.gravity;
                            ball.y = p.constrain(ball.y + ball.vy, 0, 379);
                        }
                        else if (this.ball.timer > ball.delay) {
                            ball.active = true;
                        }
                    }
                }
            },
            runExplosions: function () {
                p.stroke(this.groot.colors.light);
                p.strokeWeight(1);
                for (var i = this.explosions.length - 1; i >= 0; i--) {
                    var explosion = this.explosions[i];
                    p.pushMatrix();
                    p.translate(explosion.x, explosion.y);
                    p.rotate(p.radians(explosion.angle));
                    p.fill(explosion.color, explosion.opacity);
                    p.rect(-explosion.size / 2, -explosion.size / 2, explosion.size, explosion.size);
                    p.popMatrix();
                    explosion.x += explosion.vx;
                    explosion.y += explosion.vy;
                    explosion.angle += explosion.rot;
                    explosion.opacity -= explosion.opacitySpeed;
                    if (explosion.opacity <= 0) {
                        this.explosions.splice(i, 1);
                    }
                }
            },
            resetArmsX: function () {
                //left arm
                this.groot.coords.arms.left.x1 = p.lerp(this.groot.coords.arms.left.x1, 0, 0.1);
                this.groot.coords.arms.left.x2 = p.lerp(this.groot.coords.arms.left.x2, 0, 0.1);
                this.groot.coords.arms.left.x3 = p.lerp(this.groot.coords.arms.left.x3, 0, 0.1);
                this.groot.coords.arms.left.x4 = p.lerp(this.groot.coords.arms.left.x4, 0, 0.1);
                //right arm
                this.groot.coords.arms.right.x1 = p.lerp(this.groot.coords.arms.right.x1, 0, 0.1);
                this.groot.coords.arms.right.x2 = p.lerp(this.groot.coords.arms.right.x2, 0, 0.1);
                this.groot.coords.arms.right.x3 = p.lerp(this.groot.coords.arms.right.x3, 0, 0.1);
                this.groot.coords.arms.right.x4 = p.lerp(this.groot.coords.arms.right.x4, 0, 0.1);
            },
            resetArmsY: function () {
                //left arm
                this.groot.coords.arms.left.y1 = p.lerp(this.groot.coords.arms.left.y1, 0, 0.1);
                this.groot.coords.arms.left.y2 = p.lerp(this.groot.coords.arms.left.y2, 0, 0.1);
                this.groot.coords.arms.left.y3 = p.lerp(this.groot.coords.arms.left.y3, 0, 0.1);
                this.groot.coords.arms.left.y4 = p.lerp(this.groot.coords.arms.left.y4, 0, 0.1);
                //right arm
                this.groot.coords.arms.right.y1 = p.lerp(this.groot.coords.arms.right.y1, 0, 0.1);
                this.groot.coords.arms.right.y2 = p.lerp(this.groot.coords.arms.right.y2, 0, 0.1);
                this.groot.coords.arms.right.y3 = p.lerp(this.groot.coords.arms.right.y3, 0, 0.1);
                this.groot.coords.arms.right.y4 = p.lerp(this.groot.coords.arms.right.y4, 0, 0.1);
            },
            resetMouth: function () {
                this.groot.coords.mouth.x1 = p.lerp(this.groot.coords.mouth.x1, 0, 0.1);
                this.groot.coords.mouth.x2 = p.lerp(this.groot.coords.mouth.x2, 0, 0.1);
                this.groot.coords.mouth.x3 = p.lerp(this.groot.coords.mouth.x3, 0, 0.1);
                this.groot.coords.mouth.x4 = p.lerp(this.groot.coords.mouth.x4, 0, 0.1);
                this.groot.coords.mouth.x5 = p.lerp(this.groot.coords.mouth.x5, 0, 0.1);
                this.groot.coords.mouth.x6 = p.lerp(this.groot.coords.mouth.x6, 0, 0.1);
                this.groot.coords.mouth.y1 = p.lerp(this.groot.coords.mouth.y1, 0, 0.1);
                this.groot.coords.mouth.y2 = p.lerp(this.groot.coords.mouth.y2, 0, 0.1);
                this.groot.coords.mouth.y3 = p.lerp(this.groot.coords.mouth.y3, 0, 0.1);
                this.groot.coords.mouth.y4 = p.lerp(this.groot.coords.mouth.y4, 0, 0.1);
                this.groot.coords.mouth.y5 = p.lerp(this.groot.coords.mouth.y5, 0, 0.1);
                this.groot.coords.mouth.y6 = p.lerp(this.groot.coords.mouth.y6, 0, 0.1);
            },
            runAction: function () {
                switch (this.groot.action) {
                    case "idle":
                        //do nothing
                        break;
                    case "dance":
                        this.groot.vel = 7;
                        this.groot.coords.face.offset = p.cos(p.radians(this.timer * this.groot.vel)) * 10;
                        this.groot.coords.face.angle = p.sin(p.radians(this.timer * this.groot.vel)) * 5;
                        this.groot.coords.body.offset = p.sin(p.radians(this.timer * this.groot.vel)) * 12;
                        this.groot.coords.arms.left.y2 = p.lerp(this.groot.coords.arms.left.y2, this.groot.coords.body.offset, 0.2);
                        this.groot.coords.arms.left.y3 = p.lerp(this.groot.coords.arms.left.y3, this.groot.coords.body.offset, 0.2);
                        this.groot.coords.arms.right.y2 = p.lerp(this.groot.coords.arms.right.y2, this.groot.coords.body.offset, 0.2);
                        this.groot.coords.arms.right.y3 = p.lerp(this.groot.coords.arms.right.y3, this.groot.coords.body.offset, 0.2);
                        this.groot.coords.arms.left.y4 = p.lerp(this.groot.coords.arms.left.y4, 0, 0.2);
                        this.groot.coords.arms.right.y4 = p.lerp(this.groot.coords.arms.right.y4, 0, 0.2);
                        this.resetArmsX();
                        this.resetMouth();
                        break;
                    case "sleep":
                        this.groot.vel = 4;
                        this.groot.coords.face.offset = p.lerp(this.groot.coords.face.offset, p.cos(p.radians(this.timer * this.groot.vel)) * 0.5, 0.1);
                        this.groot.coords.face.angle = p.lerp(this.groot.coords.face.angle, p.sin(p.radians(this.timer * this.groot.vel)) * 0.25, 0.1);
                        this.groot.coords.body.offset = p.lerp(this.groot.coords.body.offset, 0, 0.1);
                        this.groot.coords.arms.left.y2 = p.lerp(this.groot.coords.arms.left.y2, 12, 0.1);
                        this.groot.coords.arms.left.y3 = p.lerp(this.groot.coords.arms.left.y3, 6, 0.1);
                        this.groot.coords.arms.left.y4 = p.lerp(this.groot.coords.arms.left.y4, -25, 0.1);
                        this.groot.coords.arms.right.y2 = p.lerp(this.groot.coords.arms.right.y2, 5, 0.1);
                        this.groot.coords.arms.right.y3 = p.lerp(this.groot.coords.arms.right.y3, 15, 0.1);
                        this.groot.coords.arms.right.y4 = p.lerp(this.groot.coords.arms.right.y4, 30, 0.1);
                        this.resetArmsX();
                        this.resetMouth();
                        if (this.timer % 120 < 60) {
                            this.groot.coords.mouth.y2 = p.lerp(this.groot.coords.mouth.y2, 10, 0.1);
                            this.groot.coords.mouth.y3 = p.lerp(this.groot.coords.mouth.y3, 10, 0.1);
                            this.groot.coords.mouth.y5 = p.lerp(this.groot.coords.mouth.y5, -20, 0.1);
                            this.groot.coords.mouth.y6 = p.lerp(this.groot.coords.mouth.y6, -20, 0.1);
                            this.groot.coords.mouth.x1 = p.lerp(this.groot.coords.mouth.x1, 16, 0.1);
                            this.groot.coords.mouth.x4 = p.lerp(this.groot.coords.mouth.x4, -16, 0.1);
                        }
                        else {
                            this.groot.coords.mouth.y2 = p.lerp(this.groot.coords.mouth.y2, 5, 0.1);
                            this.groot.coords.mouth.y3 = p.lerp(this.groot.coords.mouth.y3, 5, 0.1);
                            this.groot.coords.mouth.y5 = p.lerp(this.groot.coords.mouth.y5, -15, 0.1);
                            this.groot.coords.mouth.y6 = p.lerp(this.groot.coords.mouth.y6, -15, 0.1);
                            this.groot.coords.mouth.x1 = p.lerp(this.groot.coords.mouth.x1, 8, 0.1);
                            this.groot.coords.mouth.x4 = p.lerp(this.groot.coords.mouth.x4, -8, 0.1);
                        }
                        //add zzzs when sleeping
                        if (p.frameCount % 60 === 0) {
                            this.zzzs.push({
                                x: p.random(270, 330),
                                y: 180,
                                size: 40,
                                opacity: 200
                            });
                        }
                        break;
                    case "wave":
                        this.groot.vel = 4;
                        this.groot.coords.face.offset = p.lerp(this.groot.coords.face.offset, p.cos(p.radians(this.timer * this.groot.vel)) * 1, 0.1);
                        this.groot.coords.face.angle = p.lerp(this.groot.coords.face.angle, p.sin(p.radians(this.timer * this.groot.vel)) * 1, 0.1);
                        this.groot.coords.body.offset = p.lerp(this.groot.coords.body.offset, 0, 0.1);
                        //left arm
                        this.groot.coords.arms.left.x4 = p.lerp(this.groot.coords.arms.left.x4, p.sin(p.radians(this.timer * this.groot.vel * 3)) * 15, 0.1);
                        this.groot.coords.arms.left.y4 = p.lerp(this.groot.coords.arms.left.y4, 40 + p.sin(p.radians(this.timer * this.groot.vel * 3)) * -10, 0.1);
                        this.groot.coords.arms.left.x2 = p.lerp(this.groot.coords.arms.left.x2, this.groot.coords.body.offset, 0.1);
                        this.groot.coords.arms.left.x3 = p.lerp(this.groot.coords.arms.left.x3, this.groot.coords.body.offset, 0.1);
                        this.groot.coords.arms.left.y2 = p.lerp(this.groot.coords.arms.left.y2, this.groot.coords.body.offset, 0.1);
                        this.groot.coords.arms.left.y3 = p.lerp(this.groot.coords.arms.left.y3, this.groot.coords.body.offset, 0.1);
                        //right arm
                        this.groot.coords.arms.right.x4 = p.lerp(this.groot.coords.arms.right.x4, 30, 0.1);
                        this.groot.coords.arms.right.y2 = p.lerp(this.groot.coords.arms.right.y2, 5, 0.1);
                        this.groot.coords.arms.right.y3 = p.lerp(this.groot.coords.arms.right.y3, 15, 0.1);
                        this.groot.coords.arms.right.y4 = p.lerp(this.groot.coords.arms.right.y4, 45, 0.1);
                        this.groot.coords.arms.right.x2 = p.lerp(this.groot.coords.arms.right.x2, this.groot.coords.body.offset, 0.1);
                        this.groot.coords.arms.right.x3 = p.lerp(this.groot.coords.arms.right.x3, this.groot.coords.body.offset, 0.1);
                        this.resetMouth();
                        break;
                    case "eat":
                        this.groot.vel = 4;
                        this.groot.coords.face.offset = p.lerp(this.groot.coords.face.offset, p.cos(p.radians(this.timer * this.groot.vel)) * 1, 0.1);
                        this.groot.coords.face.angle = p.lerp(this.groot.coords.face.angle, p.sin(p.radians(this.timer * this.groot.vel)) * 1, 0.1);
                        this.groot.coords.body.offset = p.lerp(this.groot.coords.body.offset, 0, 0.1);
                        this.resetArmsX();
                        this.resetArmsY();
                        this.resetMouth();
                        //move mouth
                        if (this.spoon.x > 277 && this.spoon.x < 322 && this.spoon.y > 310 && this.spoon.y < 320) {
                            this.groot.coords.mouth.x1 = p.abs(p.sin(p.radians(this.talkTimer * this.groot.vel * 1.4)) * 7);
                            this.groot.coords.mouth.x4 = -p.abs(p.sin(p.radians(this.talkTimer * this.groot.vel * 1.4)) * 7);
                            this.groot.coords.mouth.y5 = -p.abs(p.sin(p.radians(this.talkTimer * this.groot.vel * 1.4)) * 12);
                            this.groot.coords.mouth.y6 = -p.abs(p.sin(p.radians(this.talkTimer * this.groot.vel * 1.4)) * 12);
                            this.groot.coords.mouth.y2 = p.abs(p.sin(p.radians(this.talkTimer * this.groot.vel * 1.4)) * 12);
                            this.groot.coords.mouth.y3 = p.abs(p.sin(p.radians(this.talkTimer * this.groot.vel * 1.4)) * 12);
                            //add crumbs to the array
                            if (p.random() < 0.02) {
                                this.crumbs.push({
                                    x: p.random(295, 305),
                                    y: p.random(300, 305),
                                    diameter: p.random(3, 6),
                                    color: this.spoon.colors.food, // p.color(p.random(160, 230)),
                                    opacity: ~~p.random(200, 240),
                                    vx: p.random(-0.5, 0.5),
                                    vy: p.random(4, 6)
                                });
                            }
                        }
                        //show crumbs
                        p.noStroke();
                        for (var i = this.crumbs.length - 1; i >= 0; i--) {
                            var crumb = this.crumbs[i];
                            p.fill(crumb.color);
                            p.ellipse(crumb.x, crumb.y, crumb.diameter, crumb.diameter);
                        }
                        //draw spoon
                        if (this.spoon.active) {
                            p.noStroke();
                            p.fill(this.spoon.colors.dark);
                            p.rect(this.spoon.x - this.spoon.w * 2.2, this.spoon.y, this.spoon.w * 2.2, this.spoon.h * 0.25, 5, 0, 0, 5);
                            p.fill(this.spoon.colors.medium);
                            p.rect(this.spoon.x - this.spoon.w * 2.2, this.spoon.y, this.spoon.w * 2.2, this.spoon.h * 0.15, 5, 0, 0, 0);
                            p.fill(this.spoon.colors.dark);
                            p.arc(this.spoon.x, this.spoon.y, this.spoon.w, this.spoon.h, 0, p.radians(180));
                            p.fill(this.spoon.colors.medium);
                            p.arc(this.spoon.x, this.spoon.y, this.spoon.w, this.spoon.h * 0.85, 0, p.radians(180));
                            p.fill(this.spoon.colors.light);
                            p.ellipse(this.spoon.x, this.spoon.y, this.spoon.w * 1.0, this.spoon.h * 0.4);
                            p.fill(this.spoon.colors.dark);
                            p.ellipse(this.spoon.x, this.spoon.y, this.spoon.w * 0.8, this.spoon.h * 0.30);
                            //draw food inside spoon
                            p.fill(this.spoon.colors.food);
                            p.ellipse(this.spoon.x, this.spoon.y - this.spoon.h * -0.00, this.spoon.w * 0.7, this.spoon.h * 0.30);
                            p.ellipse(this.spoon.x, this.spoon.y - this.spoon.h * 0.05, this.spoon.w * 0.6, this.spoon.h * 0.35);
                        }
                        break;
                    case "drink":
                        this.groot.vel = 4;
                        this.cup.x = p.constrain(p.ceil(p.lerp(this.cup.x, 300, 0.05)), -this.cup.w, 300);
                        //mouth
                        if (this.cup.x === 300) {
                            this.groot.coords.face.angle = p.lerp(this.groot.coords.face.angle, p.sin(p.radians(this.timer * this.groot.vel)) * 0.5, 0.1);
                            this.groot.coords.face.offset = p.lerp(this.groot.coords.face.offset, 0, 0.1);
                            this.groot.coords.body.offset = p.lerp(this.groot.coords.body.offset, 0, 0.1);
                            this.resetMouth();
                            if (this.timer % 60 < 45) {
                                this.groot.coords.mouth.y2 = p.lerp(this.groot.coords.mouth.y2, 10, 0.1);
                                this.groot.coords.mouth.y3 = p.lerp(this.groot.coords.mouth.y3, 10, 0.1);
                                this.groot.coords.mouth.y5 = p.lerp(this.groot.coords.mouth.y5, -25, 0.1);
                                this.groot.coords.mouth.y6 = p.lerp(this.groot.coords.mouth.y6, -25, 0.1);
                                this.groot.coords.mouth.x1 = p.lerp(this.groot.coords.mouth.x1, 16, 0.1);
                                this.groot.coords.mouth.x4 = p.lerp(this.groot.coords.mouth.x4, -16, 0.1);
                            }
                            else {
                                this.groot.coords.mouth.y2 = p.lerp(this.groot.coords.mouth.y2, 5, 0.1);
                                this.groot.coords.mouth.y3 = p.lerp(this.groot.coords.mouth.y3, 5, 0.1);
                                this.groot.coords.mouth.y5 = p.lerp(this.groot.coords.mouth.y5, -20, 0.1);
                                this.groot.coords.mouth.y6 = p.lerp(this.groot.coords.mouth.y6, -20, 0.1);
                                this.groot.coords.mouth.x1 = p.lerp(this.groot.coords.mouth.x1, 8, 0.1);
                                this.groot.coords.mouth.x4 = p.lerp(this.groot.coords.mouth.x4, -8, 0.1);
                            }
                            //right arm
                            this.groot.coords.arms.right.x4 = p.lerp(this.groot.coords.arms.right.x4, 40, 0.1);
                            this.groot.coords.arms.right.y2 = p.lerp(this.groot.coords.arms.right.y2, 5, 0.1);
                            this.groot.coords.arms.right.y3 = p.lerp(this.groot.coords.arms.right.y3, 15, 0.1);
                            this.groot.coords.arms.right.y4 = p.lerp(this.groot.coords.arms.right.y4, 45, 0.1);
                            this.groot.coords.arms.right.x2 = p.lerp(this.groot.coords.arms.right.x2, this.groot.coords.body.offset, 0.1);
                            this.groot.coords.arms.right.x3 = p.lerp(this.groot.coords.arms.right.x3, this.groot.coords.body.offset, 0.1);
                            //left arm
                            this.groot.coords.arms.left.x4 = p.lerp(this.groot.coords.arms.left.x4, -24, 0.1);
                            this.groot.coords.arms.left.y2 = p.lerp(this.groot.coords.arms.left.y2, 16, 0.1);
                            this.groot.coords.arms.left.y3 = p.lerp(this.groot.coords.arms.left.y3, 4, 0.1);
                            this.groot.coords.arms.left.y4 = p.lerp(this.groot.coords.arms.left.y4, -28, 0.1);
                            this.groot.coords.arms.left.x2 = p.lerp(this.groot.coords.arms.left.x2, this.groot.coords.body.offset, 0.1);
                            this.groot.coords.arms.left.x3 = p.lerp(this.groot.coords.arms.left.x3, this.groot.coords.body.offset, 0.1);
                        }
                        else {
                            this.groot.coords.face.offset = p.lerp(this.groot.coords.face.offset, 0, 0.1);
                            this.groot.coords.face.angle = p.lerp(this.groot.coords.face.angle, 0, 0.1);
                            this.groot.coords.body.offset = p.lerp(this.groot.coords.body.offset, 0, 0.1);
                            this.resetArmsX();
                            this.resetArmsY();
                            this.resetMouth();
                        }
                        //draw cup and slide it in
                        //cup body
                        p.stroke(this.groot.colors.outline);
                        p.strokeWeight(8);
                        p.fill(this.cup.color);
                        p.beginShape();
                        p.vertex(this.cup.x - this.cup.w * 0.5, this.cup.y);
                        p.vertex(this.cup.x + this.cup.w * 0.5, this.cup.y);
                        p.vertex(this.cup.x + this.cup.w * 0.4, this.cup.y + this.cup.h);
                        p.bezierVertex(this.cup.x + this.cup.w * 0.1, this.cup.y + this.cup.h * 1.03, this.cup.x - this.cup.w * 0.1, this.cup.y + this.cup.h * 1.03, this.cup.x - this.cup.w * 0.4, this.cup.y + this.cup.h);
                        p.endShape(p.CLOSE);
                        //white line on cup
                        p.stroke(240, 40);
                        p.strokeWeight(20);
                        p.noFill();
                        p.line(this.cup.x + this.cup.w * 0.26, this.cup.y + this.cup.h * 0.15, this.cup.x + this.cup.w * 0.20, this.cup.y + this.cup.h * 0.85);
                        //cup lid - lower
                        p.stroke(this.groot.colors.outline);
                        p.strokeWeight(4);
                        p.fill(230);
                        p.quad(this.cup.x - this.cup.w * 0.6, this.cup.y - this.cup.h * 0.1, this.cup.x + this.cup.w * 0.6, this.cup.y - this.cup.h * 0.1, this.cup.x + this.cup.w * 0.6, this.cup.y, this.cup.x - this.cup.w * 0.6, this.cup.y);
                        //cup lid - upper
                        p.quad(this.cup.x - this.cup.w * 0.48, this.cup.y - this.cup.h * 0.2, this.cup.x + this.cup.w * 0.48, this.cup.y - this.cup.h * 0.2, this.cup.x + this.cup.w * 0.5, this.cup.y - this.cup.h * 0.1, this.cup.x - this.cup.w * 0.5, this.cup.y - this.cup.h * 0.1);
                        //cup lid shading - lower
                        p.fill(40, 25);
                        p.noStroke();
                        p.beginShape();
                        p.vertex(this.cup.x + this.cup.w * 0.1, this.cup.y - this.cup.h * 0.1);
                        p.vertex(this.cup.x + this.cup.w * 0.6, this.cup.y - this.cup.h * 0.1);
                        p.vertex(this.cup.x + this.cup.w * 0.6, this.cup.y);
                        p.vertex(this.cup.x + this.cup.w * 0.16, this.cup.y);
                        p.bezierVertex(this.cup.x + this.cup.w * 0.19, this.cup.y - this.cup.h * 0.03, this.cup.x + this.cup.w * 0.19, this.cup.y - this.cup.h * 0.07, this.cup.x + this.cup.w * 0.1, this.cup.y - this.cup.h * 0.1);
                        p.endShape();
                        //cup lid shading - upper
                        p.beginShape();
                        p.vertex(this.cup.x + this.cup.w * 0.05, this.cup.y - this.cup.h * 0.2);
                        p.vertex(this.cup.x + this.cup.w * 0.48, this.cup.y - this.cup.h * 0.2);
                        p.vertex(this.cup.x + this.cup.w * 0.5, this.cup.y - this.cup.h * 0.1);
                        p.vertex(this.cup.x + this.cup.w * 0.16, this.cup.y - this.cup.h * 0.1);
                        p.bezierVertex(this.cup.x + this.cup.w * 0.19, this.cup.y - this.cup.h * 0.13, this.cup.x + this.cup.w * 0.19, this.cup.y - this.cup.h * 0.17, this.cup.x + this.cup.w * 0.05, this.cup.y - this.cup.h * 0.2);
                        p.endShape();
                        //shading cup
                        p.fill(80, 15);
                        p.beginShape();
                        p.vertex(this.cup.x + this.cup.w * 0.5, this.cup.y);
                        p.vertex(this.cup.x + this.cup.w * 0.4, this.cup.y + this.cup.h);
                        p.bezierVertex(this.cup.x + this.cup.w * 0.1, this.cup.y + this.cup.h * 1.03, this.cup.x - this.cup.w * 0.1, this.cup.y + this.cup.h * 1.03, this.cup.x - this.cup.w * 0.4, this.cup.y + this.cup.h);
                        p.endShape(p.CLOSE);
                        //straw
                        p.fill(230);
                        p.stroke(this.groot.colors.outline);
                        p.strokeWeight(4);
                        p.beginShape();
                        p.vertex(this.cup.x + this.cup.w * 0.05, this.cup.y - this.cup.h * 0.2);
                        p.vertex(this.cup.x + this.cup.w * 0.25, this.cup.y - this.cup.h * 0.44);
                        p.vertex(this.cup.x + this.cup.w * -0.02, this.cup.y - this.cup.h * 0.43);
                        p.vertex(this.cup.x + this.cup.w * -0.02, this.cup.y - this.cup.h * 0.48);
                        p.vertex(this.cup.x + this.cup.w * 0.38, this.cup.y - this.cup.h * 0.50);
                        p.vertex(this.cup.x + this.cup.w * 0.14, this.cup.y - this.cup.h * 0.2);
                        p.endShape();
                        p.strokeWeight(1);
                        break;
                    case "talk":
                        this.groot.vel = 4;
                        this.groot.coords.face.offset = p.lerp(this.groot.coords.face.offset, p.cos(p.radians(this.talkTimer * this.groot.vel)) * 1, 0.1);
                        this.groot.coords.face.angle = p.lerp(this.groot.coords.face.angle, p.sin(p.radians(this.talkTimer * this.groot.vel)) * 1, 0.1);
                        this.groot.coords.body.offset = p.lerp(this.groot.coords.body.offset, 0, 0.1);
                        this.resetArmsX();
                        this.resetArmsY();
                        if (this.talkTimer % 360 < 120) {
                            this.resetMouth();
                        }
                        else {
                            this.groot.coords.mouth.x1 = p.abs(p.sin(p.radians(this.talkTimer * this.groot.vel * 0.9)) * 5);
                            this.groot.coords.mouth.x4 = -p.abs(p.sin(p.radians(this.talkTimer * this.groot.vel * 1.28)) * 5);
                            this.groot.coords.mouth.y5 = -p.abs(p.sin(p.radians(this.talkTimer * this.groot.vel * 2.2)) * 15);
                            this.groot.coords.mouth.y6 = -p.abs(p.cos(p.radians(this.talkTimer * this.groot.vel * 1.23)) * 15);
                            this.groot.coords.mouth.y2 = p.abs(p.sin(p.radians(this.talkTimer * this.groot.vel * 1)) * 5);
                            this.groot.coords.mouth.y3 = p.abs(p.cos(p.radians(this.talkTimer * this.groot.vel * 1)) * 5);
                            //show words
                            if (this.talkTimer % 360 === 140) {
                                // I
                                this.words[0].active = true;
                            }
                            else if (this.talkTimer % 360 === 210) {
                                //Am
                                this.words[1].active = true;
                            }
                            else if (this.talkTimer % 360 === 280) {
                                // Groot
                                this.words[2].active = true;
                            }
                        }
                        break;
                    case "juggle":
                        this.groot.vel = 4;
                        this.groot.coords.face.offset = p.lerp(this.groot.coords.face.offset, p.cos(p.radians(this.timer * this.groot.vel)) * 1, 0.1);
                        this.groot.coords.face.angle = p.lerp(this.groot.coords.face.angle, p.sin(p.radians(this.timer * this.groot.vel)) * 1, 0.1);
                        this.groot.coords.body.offset = p.lerp(this.groot.coords.body.offset, 0, 0.1);
                        this.resetArmsX();
                        this.resetArmsY();
                        this.resetMouth();
                        this.groot.coords.arms.left.y2 = p.lerp(this.groot.coords.arms.left.y2, this.groot.coords.body.offset, 0.2);
                        this.groot.coords.arms.left.y3 = p.lerp(this.groot.coords.arms.left.y3, this.groot.coords.body.offset, 0.2);
                        this.groot.coords.arms.right.y2 = p.lerp(this.groot.coords.arms.right.y2, this.groot.coords.body.offset, 0.2);
                        this.groot.coords.arms.right.y3 = p.lerp(this.groot.coords.arms.right.y3, this.groot.coords.body.offset, 0.2);
                        if (this.balls[0].active) {
                            this.groot.coords.body.offset = p.sin(p.radians(this.timer * this.groot.vel * 1.4)) * 12;
                        }
                        if (this.ball.left === true) {
                            this.groot.coords.arms.left.y4 = p.lerp(this.groot.coords.arms.left.y4, 40, 0.2);
                            if (this.ball.timer % 15 === 0) {
                                this.ball.left = false;
                            }
                        }
                        if (this.ball.right === true) {
                            this.groot.coords.arms.right.y4 = p.lerp(this.groot.coords.arms.right.y4, -40, 0.2);
                            if (this.ball.timer % 15 === 0) {
                                this.ball.right = false;
                            }
                        }
                        this.runBalls();
                        break;
                    case "hop":
                        break;
                }
                // Keep the eyes on the real pointer even when the canvas is scaled.
                if (this.groot.action === "idle") {
                    this.groot.vel = 4;
                    this.resetMouth();
                    var pointer = this.homeosPointer || { over: this.over, x: p.mouseX, y: p.mouseY };
                    var pointerOver = pointer.over || this.over;
                    var pointerX = pointer.over ? pointer.x : p.mouseX;
                    if (!pointerOver) {
                        this.groot.coords.face.offset = p.lerp(this.groot.coords.face.offset, 0, 0.1);
                        this.groot.coords.face.angle = p.lerp(this.groot.coords.face.angle, 0, 0.1);
                        this.groot.coords.body.offset = p.lerp(this.groot.coords.body.offset, 0, 0.1);
                        this.resetArmsX();
                        this.resetArmsY();
                    }
                    else {
                        this.groot.coords.face.offset = p.lerp(this.groot.coords.face.offset, p.map(pointerX, 0, 600, -12, 12), 0.13);
                        this.groot.coords.face.angle = p.lerp(this.groot.coords.face.angle, p.map(pointerX, 0, 600, 9, -9), 0.13);
                        this.groot.coords.body.offset = p.lerp(this.groot.coords.body.offset, p.map(pointerX, 0, 600, -8, 8), 0.1);
                        this.groot.coords.arms.left.y2 = p.lerp(this.groot.coords.arms.left.y2, this.groot.coords.body.offset, 0.1);
                        this.groot.coords.arms.left.y3 = p.lerp(this.groot.coords.arms.left.y3, this.groot.coords.body.offset, 0.1);
                        this.groot.coords.arms.right.y2 = p.lerp(this.groot.coords.arms.right.y2, this.groot.coords.body.offset, 0.1);
                        this.groot.coords.arms.right.y3 = p.lerp(this.groot.coords.arms.right.y3, this.groot.coords.body.offset, 0.1);
                        this.groot.coords.arms.left.y4 = p.lerp(this.groot.coords.arms.left.y4, 0, 0.1);
                        this.groot.coords.arms.right.y4 = p.lerp(this.groot.coords.arms.right.y4, 0, 0.1);
                        this.resetArmsX();
                    }
                    // Match the face to the current care level.
                    var mood = this.homeosHealth || "healthy";
                    var mouthCenter = 0;
                    if (mood === "dry")
                        mouthCenter = -16;
                    else if (mood === "struggling")
                        mouthCenter = -10;
                    else if (mood === "recovering")
                        mouthCenter = -2;
                    else if (mood === "healthy")
                        mouthCenter = 5;
                    else if (mood === "glowing")
                        mouthCenter = 9;
                    this.groot.coords.mouth.y2 = p.lerp(this.groot.coords.mouth.y2, mouthCenter, 0.18);
                    this.groot.coords.mouth.y3 = p.lerp(this.groot.coords.mouth.y3, mouthCenter, 0.18);
                    this.groot.coords.mouth.y5 = p.lerp(this.groot.coords.mouth.y5, mood === "dry" ? -6 : 0, 0.15);
                    this.groot.coords.mouth.y6 = p.lerp(this.groot.coords.mouth.y6, mood === "dry" ? -6 : 0, 0.15);
                }
                if (this.groot.action !== "sleep") {
                    this.groot.eyeClose = 0;
                }
            },
            updateJuggleButtons: function (juggleObject) {
                for (var i in this.buttons.juggles) {
                    if (this.buttons.juggles[i].content.toLowerCase() === juggleObject) {
                        this.buttons.juggles[i].selected = true;
                    }
                    else {
                        this.buttons.juggles[i].selected = false;
                    }
                }
            },
            updateThemeButtons: function (themeName) {
                for (var i in this.buttons.themes) {
                    if (this.buttons.themes[i].content.toLowerCase() === themeName) {
                        this.buttons.themes[i].selected = true;
                    }
                    else {
                        this.buttons.themes[i].selected = false;
                    }
                }
            },
            updateCharacterButtons: function (character) {
                for (var i in this.buttons.characters) {
                    if (this.buttons.characters[i].content.toLowerCase() === character) {
                        this.buttons.characters[i].selected = true;
                    }
                    else {
                        this.buttons.characters[i].selected = false;
                    }
                }
            },
            updateActionButtons: function () {
                for (var i in this.buttons.actions) {
                    if (this.buttons.actions[i].content.toLowerCase() === this.groot.action) {
                        this.buttons.actions[i].selected = true;
                    }
                    else {
                        this.buttons.actions[i].selected = false;
                    }
                }
            },
            update: function () {
                this.timer++;
                this.talkTimer++;
                //blinking
                if (this.groot.blink.active === false) {
                    if (p.random() < 0.005) {
                        this.groot.blink.active = true;
                        this.groot.blink.timer = 0;
                    }
                }
                else if (this.groot.blink.timer > 15) {
                    this.groot.blink.active = false;
                }
                // Move the spoon with the bridged pointer so Feed still works
                // on a responsive/scaled canvas.
                var homeosPointer = this.homeosPointer || { over: false, x: p.mouseX, y: p.mouseY };
                scene.spoon.x = homeosPointer.over ? homeosPointer.x : p.mouseX;
                scene.spoon.y = (homeosPointer.over ? homeosPointer.y : p.mouseY) - 20;
                //set spoon as active if current action is eat and not over button or out of screen
                this.spoon.active = this.over && (!this.hover || this.buttons.actions.eat.hover) && this.groot.action === "eat";
                //handle moving and removing crumbs
                for (var i = this.crumbs.length - 1; i >= 0; i--) {
                    var crumb = this.crumbs[i];
                    crumb.x += crumb.vx;
                    crumb.y += crumb.vy;
                    if (crumb.y + crumb.diameter > p.height) {
                        this.crumbs.splice(i, 1);
                    }
                }
                // Daily Rhythm decides bedtime. Idle time only drives movement.
                this.idle.value = ~~((p.millis() - this.idle.time) / 1000);
            },
            draw: function () {
                p.background(scene.theme.back);
                p.noStroke();
                p.fill(scene.theme.ground);
                p.beginShape();
                p.vertex(0, 510);
                p.bezierVertex(200, 490, 400, 490, 600, 510);
                p.vertex(600, 600);
                p.vertex(0, 600);
                p.endShape(p.CLOSE);
                if (this.theme === this.themes.winter) {
                    if (p.frameCount % 20 === 0) {
                        var diameter = p.random(5, 20);
                        this.snows.push({
                            x: p.random(600),
                            y: p.random(-50, -20),
                            vy: p.random(2, 4),
                            diameter: diameter,
                            color: p.color(240 + diameter),
                            opacity: p.random(100, 150)
                        });
                    }
                    //snow on groot's head
                    for (var i = 0; i < this.groot.coords.snow.length; i++) {
                        this.groot.coords.snow[i].opacity = p.lerp(this.groot.coords.snow[i].opacity, 240, 0.1);
                    }
                }
                else { //fade snow out an remove if not winter
                    for (var i = this.snows.length - 1; i >= 0; i--) {
                        this.snows[i].opacity -= 2;
                        if (this.snows[i].opacity <= 0) {
                            this.snows.splice(i, 1);
                        }
                    }
                    //snow on groot's head
                    for (var i = 0; i < this.groot.coords.snow.length; i++) {
                        this.groot.coords.snow[i].opacity = p.lerp(this.groot.coords.snow[i].opacity, 0, 0.1);
                    }
                }
                //sun
                // p.noStroke();
                // p.fill(this.sun.colors.fill, this.sun.opacity);
                // p.stroke(this.sun.colors.stroke, this.sun.opacity);
                // p.strokeWeight(6);
                // p.ellipse(this.sun.x, this.sun.y, this.sun.diameter, this.sun.diameter);
                //snow
                p.noStroke();
                for (var i = this.snows.length - 1; i >= 0; i--) {
                    var snow = this.snows[i];
                    if (snow.diameter > 15) {
                        continue;
                    }
                    p.fill(snow.color, snow.opacity);
                    p.ellipse(snow.x, snow.y, snow.diameter, snow.diameter);
                    snow.y += snow.vy;
                    if (snow.y - snow.diameter > 600) {
                        this.snows.splice(i, 1);
                    }
                }
                //handle differences between seasons
                //show leaves and hide snow
                if (this.theme === this.themes.summer) {
                    for (var i = 0; i < this.groot.coords.leaves.length; i++) {
                        this.groot.coords.leaves[i].scale = p.lerp(this.groot.coords.leaves[i].scale, this.groot.coords.leaves[i].scaleMax, 0.1);
                    }
                    for (var i = 0; i < this.groot.coords.flowers.length; i++) {
                        this.groot.coords.flowers[i].scale = p.lerp(this.groot.coords.flowers[i].scale, 0, 0.1);
                    }
                    for (var i = 0; i < this.groot.coords.sticks.length; i++) {
                        this.groot.coords.sticks[i].scale = p.lerp(this.groot.coords.sticks[i].scale, 0, 0.1);
                    }
                    // this.sun.x = p.lerp(this.sun.x, 0, 0.1);
                    // this.sun.y = p.lerp(this.sun.y, 0, 0.1);
                    this.sun.x = p.lerp(this.sun.x, -this.sun.diameter * 0.5, 0.1);
                    this.sun.y = p.lerp(this.sun.y, -this.sun.diameter * 0.5, 0.1);
                }
                //show leaves (autumn) and hide snow
                //also show falling autumn leaves similar to falling snow in winter
                else if (this.theme === this.themes.fall) {
                    for (var i = 0; i < this.groot.coords.leaves.length; i++) {
                        this.groot.coords.leaves[i].scale = p.lerp(this.groot.coords.leaves[i].scale, this.groot.coords.leaves[i].scaleMax, 0.1);
                    }
                    for (var i = 0; i < this.groot.coords.flowers.length; i++) {
                        this.groot.coords.flowers[i].scale = p.lerp(this.groot.coords.flowers[i].scale, 0, 0.1);
                    }
                    for (var i = 0; i < this.groot.coords.sticks.length; i++) {
                        this.groot.coords.sticks[i].scale = p.lerp(this.groot.coords.sticks[i].scale, 0, 0.1);
                    }
                    this.sun.x = p.lerp(this.sun.x, -this.sun.diameter * 0.5, 0.1);
                    this.sun.y = p.lerp(this.sun.y, -this.sun.diameter * 0.5, 0.1);
                }
                //hide leaves and show snow on groot and falling snow
                else if (this.theme === this.themes.winter) {
                    for (var i = 0; i < this.groot.coords.leaves.length; i++) {
                        this.groot.coords.leaves[i].scale = p.lerp(this.groot.coords.leaves[i].scale, 0, 0.1);
                    }
                    for (var i = 0; i < this.groot.coords.flowers.length; i++) {
                        this.groot.coords.flowers[i].scale = p.lerp(this.groot.coords.flowers[i].scale, 0, 0.5);
                    }
                    for (var i = 0; i < this.groot.coords.sticks.length; i++) {
                        this.groot.coords.sticks[i].scale = p.lerp(this.groot.coords.sticks[i].scale, this.groot.coords.sticks[i].scaleMax, 0.1);
                    }
                    this.sun.x = p.lerp(this.sun.x, -this.sun.diameter * 0.5, 0.1);
                    this.sun.y = p.lerp(this.sun.y, -this.sun.diameter * 0.5, 0.1);
                }
                //show smaller leaves and spring flowers
                else if (this.theme === this.themes.spring) {
                    for (var i = 0; i < this.groot.coords.leaves.length; i++) {
                        this.groot.coords.leaves[i].scale = p.lerp(this.groot.coords.leaves[i].scale, this.groot.coords.leaves[i].scaleMax * 0.7, 0.1);
                    }
                    for (var i = 0; i < this.groot.coords.flowers.length; i++) {
                        this.groot.coords.flowers[i].scale = p.lerp(this.groot.coords.flowers[i].scale, this.groot.coords.flowers[i].scaleMax, 0.1);
                    }
                    for (var i = 0; i < this.groot.coords.sticks.length; i++) {
                        this.groot.coords.sticks[i].scale = p.lerp(this.groot.coords.sticks[i].scale, 0, 0.1);
                    }
                    this.sun.x = p.lerp(this.sun.x, -this.sun.diameter * 0.5, 0.1);
                    this.sun.y = p.lerp(this.sun.y, -this.sun.diameter * 0.5, 0.1);
                }
                // Completed shifts can force the flowers open in any season.
                if (this.homeosBloom) {
                    for (var i = 0; i < this.groot.coords.flowers.length; i++) {
                        this.groot.coords.flowers[i].scale = p.lerp(this.groot.coords.flowers[i].scale, this.groot.coords.flowers[i].scaleMax, 0.14);
                    }
                }
                // Lower care shrinks the leaves and brings the twigs forward.
                if (!this.homeosBloom && this.theme !== this.themes.winter) {
                    var health = this.homeosHealth || "healthy";
                    var leafFactor = 1.0;
                    var twigFactor = 0.0;
                    if (health === "dry") {
                        leafFactor = 0.28;
                        twigFactor = 0.42;
                    }
                    else if (health === "struggling") {
                        leafFactor = 0.50;
                        twigFactor = 0.25;
                    }
                    else if (health === "recovering") {
                        leafFactor = 0.74;
                        twigFactor = 0.08;
                    }
                    else if (health === "sleeping") {
                        leafFactor = 0.88;
                        twigFactor = 0.0;
                    }
                    var seasonFactor = this.theme === this.themes.spring ? 0.70 : 1.0;
                    for (var i = 0; i < this.groot.coords.leaves.length; i++) {
                        this.groot.coords.leaves[i].scale = p.lerp(this.groot.coords.leaves[i].scale, this.groot.coords.leaves[i].scaleMax * seasonFactor * leafFactor, 0.22);
                    }
                    for (var i = 0; i < this.groot.coords.sticks.length; i++) {
                        this.groot.coords.sticks[i].scale = p.lerp(this.groot.coords.sticks[i].scale, this.groot.coords.sticks[i].scaleMax * twigFactor, 0.18);
                    }
                    if (health === "dry" || health === "struggling") {
                        for (var i = 0; i < this.groot.coords.flowers.length; i++) {
                            this.groot.coords.flowers[i].scale = p.lerp(this.groot.coords.flowers[i].scale, 0, 0.22);
                        }
                    }
                }
                // HomeOS uses the action buttons outside the canvas.
            },
            go: function (fr) {
                this.draw();
                this.update();
                this.runZs();
                p.pushMatrix();
                this.shakeScreen();
                // A small idle breeze keeps the buddy from feeling frozen.
                if (this.groot.action === "idle" && !this.homeosScheduleSleeping) {
                    var breezeAngle = p.sin(p.frameCount * 0.018) * 0.55;
                    var breezeX = p.sin(p.frameCount * 0.026) * 1.25;
                    var breezeY = p.cos(p.frameCount * 0.021) * 0.45;
                    p.translate(300, 500);
                    p.rotate(p.radians(breezeAngle));
                    p.translate(-300, -500);
                    p.translate(breezeX, breezeY);
                }
                this.groot.go();
                this.runAction();
                p.popMatrix();
                //display snow falling in front of groot
                p.noStroke();
                for (var i = this.snows.length - 1; i >= 0; i--) {
                    var snow = this.snows[i];
                    if (snow.diameter <= 15) {
                        continue;
                    }
                    p.fill(snow.color, snow.opacity);
                    p.ellipse(snow.x, snow.y, snow.diameter, snow.diameter);
                    snow.y += snow.vy;
                    if (snow.y - snow.diameter > 600) {
                        this.snows.splice(i, 1);
                    }
                }
                //words
                for (var i = 0; i < this.words.length; i++) {
                    var word = this.words[i];
                    if (word.active) {
                        p.pushStyle();
                        p.textFont(p.createFont("ARIAL BLACK"));
                        p.textAlign(p.CENTER, p.CENTER);
                        p.textSize(30);
                        p.fill(220, word.opacity);
                        p.text(word.content, word.x, word.y);
                        word.opacity = p.constrain(word.opacity + (word.dir * 4), 0, 220);
                        if (word.opacity === 220) {
                            word.dir = -1;
                        }
                        else if (word.opacity === 0) {
                            word.opacity = 0;
                            word.active = false;
                            word.dir = 1;
                        }
                        p.popStyle();
                    }
                }
                //check if clicked on groot
                if (this.clicked && !this.hover && this.collisionColor(p.get(p.mouseX, p.mouseY))) {
                    this.shake = 10;
                    //add some other animation here
                    for (var i = 0; i < 10; i++) {
                        this.explosions.push({
                            x: p.mouseX,
                            y: p.mouseY,
                            size: p.random(5, 10),
                            color: this.selectedColor,
                            vx: p.random(-2, 2),
                            vy: p.random(-2, 2),
                            angle: 0,
                            rot: p.random(-5, 5),
                            opacity: 255,
                            opacitySpeed: p.random(3, 6)
                        });
                    }
                }
                this.runExplosions();
                p.cursor(this.hover ? 'pointer' : 'default');
                this.hover = false;
                this.clicked = false;
                this.spoon.hover = false;
            }
        };
        return Scene;
    })();
    // --- Bridge back to HomeOS ---
    scene = new Scene();
    p.__homeosScene = scene;
    p.draw = function () {
        scene.go();
    };
};
window.HomeOSGrootSketchProc = sketchProc;
