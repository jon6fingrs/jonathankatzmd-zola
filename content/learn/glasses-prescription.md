+++
title = "Your Glasses Prescription"
description = "Enter a glasses prescription and see how the world looks with and without it at distance, arm's length and reading distance, compared with normal vision."
template = "page.html"
weight = 2

[extra]
article = true
scripts = ["vendor/qrcode.js", "js/schedule-common.js", "js/rx-optics.js", "js/vision.js"]
+++

A glasses prescription is a short list of numbers for each eye, and it says exactly how the eye focuses. Enter yours below to see what it means: how blurry each distance is without glasses, what the glasses fix, and where a reading add comes in. Drag the handle to compare with normal vision, just like the [vision loss simulator](@/learn/vision-loss.md).

<div id="jk-vision" class="jk-vis" data-mode="rx" data-base="../../images/vision/">
  <p class="jk-vis__noscript">The simulator needs JavaScript. How to read a prescription is explained in words below.</p>
</div>

## Reading the numbers

A prescription has a row for each eye. **OD** is the right eye and **OS** the left (sometimes **OU** means both).

- **Sphere** is the main focusing error, in diopters. A minus number means nearsighted: close things are clear and distance is blurry. A plus number means farsighted: the eye has to work to focus at every distance, and close up first runs out. The bigger the number, the stronger the glasses.
- **Cylinder** is astigmatism, the part of the error that differs between directions because the front of the eye is curved more like a football than a basketball. It smears the picture in one direction. No number, or "SPH" or "DS", means none.
- **Axis** is the direction of the astigmatism, from 1 to 180 degrees. It only means something when there is a cylinder.
- **Add** is extra plus power for reading, in the lower part of bifocals or progressives, or on its own as reading glasses. It is needed because of presbyopia, described below.

Prescriptions may also list prism, which is for eyes that do not point together; the simulator leaves it out.

## Distance, intermediate and near {#distances}

The eye changes focus for things at different distances by changing the shape of its lens (accommodation).

- **Distance** is anything beyond a few metres: driving, the TV, faces across a room. A nearsighted eye blurs here; most other eyes are at their best.
- **Intermediate** is arm's length, around two feet: a computer screen, the car dashboard, the stove top.
- **Near** is reading distance, around 16 inches: a book, a phone, a pill bottle label.

A nearsighted eye is naturally in focus somewhere up close. A −2.00 eye, for example, is clear at about 50 cm without glasses, which is why many nearsighted people take their glasses off to read.

## Presbyopia: why reading gets harder in your 40s {#presbyopia}

The lens stiffens with age and gradually loses its ability to focus up close. A ten-year-old can focus to a few centimetres; by the mid-40s most people need to hold print at arm's length; by the 60s there is little focusing left at all. This is presbyopia. It happens to everyone, whatever their prescription, and is why the simulator asks for your age. It is corrected with the add: reading glasses, bifocals, progressives, or contact lenses or lens implants designed for near.

## How the simulator works {#how-it-works}

The simulator works out, for each eye and each distance, how much focusing error is left over after the eye has done what it can at the age you enter, and blurs the scene by that amount. With astigmatism the blur is stronger in one direction, set by the axis. "With these glasses" assumes the add, if there is one, is in a progressive or bifocal: the full add for reading, about half of it at arm's length. The 20/ numbers are rough equivalents from the usual rule of thumb, not a measurement.

Real vision also depends on the pupil size, the lighting, the health of the eye and the brain's ability to adapt, so treat the pictures as a guide. If your glasses no longer give you clear vision, or one eye has changed, make an appointment: a change in prescription can also be an early sign of a cataract or other eye condition.

<p class="jk-note">Scene photographs are public domain (CC0): "Nighttime Traffic" by Anthony Delanoix; "Family Breakfast" by Direct Media; "Newspaper Magazine" by Patryk Dziejma; "Crosswalk Intersection" by Peter Miranda; kitchen by rawpixel.</p>
