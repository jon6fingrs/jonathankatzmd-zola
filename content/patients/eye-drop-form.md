+++
title = "Eye Drop Form Generator"
description = "Build a printable schedule from the eye drop reference list."
template = "page.html"
weight = 3

[extra]
js = "js/dropform.js"
centered = true
+++

<form id="jk-dropform" class="jk-dropform" data-source="/data/eye-drops.json">
  <div id="jk-dropform-rows"></div>
  <div class="jk-dropform__actions">
    <button type="submit" class="btn btn-primary">Submit</button>
    <button type="button" class="btn btn-primary" id="jk-dropform-reset">Reset</button>
  </div>
</form>

<div class="jk-printhead">
  <div class="jk-printhead__name">Jonathan Katz, MD</div>
  <div class="jk-printhead__sub">Ophthalmologist &middot; Glaucoma Specialist</div>
  <div class="jk-printhead__sub">Katzen Eye Group &middot; 410-821-9490 &middot; jonathankatzmd.com</div>
</div>

<div id="jk-dropform-result" class="jk-schedule" hidden></div>

<template id="jk-dropform-row">
  <div class="jk-droprow">
    <label>Generic Name:
      <select name="genericName" class="jk-in jk-in--wide"><option value="">Select Generic Name</option></select>
    </label>
    <label>Brand Name:
      <select name="brandName" class="jk-in"><option value="">Select Brand Name</option></select>
    </label>
    <label>Top Color:
      <input type="text" name="topColor" class="jk-in" readonly>
    </label>
    <label>Times per Day:
      <select name="timesPerDay" class="jk-in jk-in--xs">
        <option>1</option><option>2</option><option>3</option><option>4</option>
        <option>5</option><option>6</option><option>7</option><option>8</option>
      </select>
    </label>
    <label>Eye:
      <select name="eye" class="jk-in jk-in--sm">
        <option>Right Eye</option><option>Left Eye</option><option>Both Eyes</option>
      </select>
    </label>
    <label>Stop Date:
      <input type="date" name="stopDate" class="jk-in">
    </label>
    <button type="button" class="jk-rowbtn jk-rowbtn--add" title="Add row">+</button>
    <button type="button" class="jk-rowbtn jk-rowbtn--del" title="Remove row">-</button>
  </div>
</template>
