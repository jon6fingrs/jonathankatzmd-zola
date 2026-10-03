+++
title = "Post-Op Eye Drop Schedule"
description = "Generate a personalized post-operative eye drop schedule."
template = "page.html"
weight = 2

[extra]
scripts = ["vendor/qrcode.js", "js/schedule-common.js", "js/postop-rules.js", "js/postop.js"]
centered = true
+++

<p class="jk-page__lede">Choose the surgery and the drops that were prescribed. The schedule shows every day's doses as boxes to tick off, and can be printed, saved to a phone's calendar with reminders, or opened on a phone by scanning a QR code.</p>

<form id="jk-postop-form" class="jk-postop" novalidate>
  <div class="jk-field">
    <label for="surgery_date">Surgery Date</label>
    <input type="date" id="surgery_date" name="surgery_date">
    <p class="jk-field__hint">Drops begin the day after surgery. Leave blank to use today.</p>
  </div>

  <div class="jk-field">
    <label for="surgery_type">Type of Surgery</label>
    <select id="surgery_type" name="surgery_type" required>
      <option value="">Select surgery type</option>
      <option>Cataract Surgery</option>
      <option>Cataract Surgery + MIGS</option>
      <option>Standalone Omni</option>
      <option>Tube Shunt Surgery</option>
      <option>Trabeculectomy</option>
      <option>Pterygium Surgery</option>
      <option>Micropulse CPC</option>
      <option>Standard CPC</option>
    </select>
  </div>

  <div class="jk-field" data-field="steroid">
    <label for="steroid">Steroid</label>
    <select id="steroid" name="steroid">
      <option value="">Select steroid</option>
      <option>Prednisolone Acetate</option>
      <option>Pred-Moxi-Brom</option>
    </select>
    <p class="jk-field__hint" data-hint></p>
  </div>

  <div class="jk-field" data-field="antibiotic">
    <label for="antibiotic">Antibiotic</label>
    <select id="antibiotic" name="antibiotic">
      <option value="">Select antibiotic</option>
      <option>Gatifloxacin</option>
      <option>Moxifloxacin</option>
      <option>Ofloxacin</option>
      <option>Ciprofloxacin</option>
      <option>Polymyxin B Sulfate and Trimethoprim</option>
    </select>
    <p class="jk-field__hint" data-hint></p>
  </div>

  <div class="jk-field" data-field="nsaid">
    <label for="nsaid">NSAID</label>
    <select id="nsaid" name="nsaid">
      <option value="">Select NSAID</option>
      <option>Ketorolac</option>
      <option>Prolensa</option>
      <option>Bromfenac</option>
      <option>Diclofenac</option>
      <option>Flurbiprofen</option>
    </select>
    <p class="jk-field__hint" data-hint></p>
  </div>

  <div class="jk-field" data-field="ointment">
    <label for="ointment">Ophthalmic Ointment</label>
    <select id="ointment" name="ointment">
      <option value="">Select ointment</option>
      <option>Maxitrol</option>
      <option>Erythromycin</option>
    </select>
    <p class="jk-field__hint" data-hint></p>
  </div>

  <p class="jk-form__error" id="jk-postop-error" role="alert" hidden></p>

  <div class="jk-postop__actions">
    <button type="submit" class="btn btn-primary">Create schedule</button>
    <button type="reset" class="btn btn-secondary">Reset</button>
  </div>
</form>

<div class="jk-printhead">
  <div class="jk-printhead__name">Jonathan Katz, MD</div>
  <div class="jk-printhead__sub">Ophthalmologist &middot; Glaucoma Specialist</div>
  <div class="jk-printhead__sub">Katzen Eye Group &middot; 410-821-9490 &middot; jonathankatzmd.com</div>
</div>

<div id="jk-postop-result" class="jk-schedule" hidden></div>
