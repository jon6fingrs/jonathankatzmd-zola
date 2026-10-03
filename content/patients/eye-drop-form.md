+++
title = "Eye Drop Schedule Builder"
description = "Build a printable eye drop schedule with a daily routine, calendar reminders, and a QR code for your phone."
template = "page.html"
weight = 3

[extra]
scripts = ["vendor/qrcode.js", "js/schedule-common.js", "js/dropform.js"]
centered = true
+++

<p class="jk-page__lede">Add each eye drop, how many times a day it is used, and which eye. The schedule lists the drops and a daily routine with suggested times, spacing drops five minutes apart. It can be printed, added to a phone's calendar with reminders, or opened on a phone with its QR code.</p>

<form id="jk-dropform" class="jk-dropform" data-source="../../data/eye-drops.json" novalidate>
  <div id="jk-dropform-rows"></div>
  <p class="jk-form__error" id="jk-dropform-error" role="alert" hidden></p>
  <div class="jk-dropform__actions">
    <button type="button" class="btn btn-outline-primary" id="jk-dropform-add">+ Add another drop</button>
    <button type="submit" class="btn btn-primary">Create schedule</button>
    <button type="button" class="btn btn-secondary" id="jk-dropform-reset">Reset</button>
  </div>
</form>

<div class="jk-printhead">
  <div class="jk-printhead__name">Jonathan Katz, MD</div>
  <div class="jk-printhead__sub">Ophthalmologist &middot; Glaucoma Specialist</div>
  <div class="jk-printhead__sub">Katzen Eye Group &middot; 410-821-9490 &middot; jonathankatzmd.com</div>
</div>

<div id="jk-dropform-result" class="jk-schedule" hidden></div>

<template id="jk-dropform-row">
  <fieldset class="jk-droprow">
    <legend class="jk-droprow__legend">Drop <span class="jk-droprow__n">1</span></legend>
    <label class="jk-droprow__f jk-droprow__f--wide">
      <span>Generic name</span>
      <select name="genericName" class="jk-in"><option value="">Select generic name</option></select>
    </label>
    <label class="jk-droprow__f jk-droprow__f--wide">
      <span>Brand name</span>
      <select name="brandName" class="jk-in"><option value="">Select brand name</option></select>
    </label>
    <div class="jk-droprow__f">
      <span>Cap color</span>
      <output name="topColor" class="jk-colorchip" aria-live="polite"><span class="jk-colorchip__text">—</span></output>
    </div>
    <label class="jk-droprow__f jk-droprow__f--xs">
      <span>Times per day</span>
      <select name="timesPerDay" class="jk-in">
        <option>1</option><option>2</option><option>3</option><option>4</option>
        <option>5</option><option>6</option><option>7</option><option>8</option>
      </select>
    </label>
    <label class="jk-droprow__f jk-droprow__f--sm">
      <span>Eye</span>
      <select name="eye" class="jk-in">
        <option>Right Eye</option><option>Left Eye</option><option>Both Eyes</option>
      </select>
    </label>
    <label class="jk-droprow__f jk-droprow__f--sm">
      <span>Stop date <small>(optional)</small></span>
      <input type="date" name="stopDate" class="jk-in">
    </label>
    <button type="button" class="jk-rowbtn jk-rowbtn--del" aria-label="Remove this drop">Remove</button>
  </fieldset>
</template>
