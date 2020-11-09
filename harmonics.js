var maxGainAt = 110;
var finalGain = .5;
var minScalePlaybackDuration = 1, toneDuration = 1;
var rampLength = .015;

var nHarmonics = 32;
var audioCtx;
var compressor;

function Track() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    compressor = audioCtx.createDynamicsCompressor();
    var finalGainNode = audioCtx.createGain();

    finalGainNode.gain.setValueAtTime(finalGain, 0);

    compressor.connect(finalGainNode);
    finalGainNode.connect(audioCtx.destination);
  }

  var oscillator = audioCtx.createOscillator();
  var gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(compressor);

  var length = 0;
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);

  this.start = function () {
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + length);
  };

  this.addTone = function (frequency, duration) {
    var gain = Math.min(1, maxGainAt / frequency);
    var t = audioCtx.currentTime + length;

    oscillator.frequency.setValueAtTime(frequency, t);
    gainNode.gain.linearRampToValueAtTime(gain, t + rampLength);
    gainNode.gain.setValueAtTime(gain, t + duration - rampLength);
    gainNode.gain.linearRampToValueAtTime(0, t + duration);

    length += duration;
    return this;
  };
}

function Scale() {
  this.fundamental = $("#fundamental").val();
  this.degrees = $("#scale").val();

  this.scaleFrequency = function (degree) {
    return this.fundamental * Math.pow(2, degree / this.degrees);
  };

  this.harmonicFrequency = function (harmonic) {
    return this.fundamental * harmonic;
  }

  this.toDegree = function (harmonic) {
    return Math.log2(harmonic) * this.degrees;
  };
}

function factorHarmonic(harmonic) {
  var exp = 0;
  while (harmonic % 2 == 0) {
    ++exp;
    harmonic >>= 1;
  }
  return {
    odd: harmonic,
    exp: exp
  };
}

function formatIntonation(intonation) {
  return intonation > 0 ? "+ " + intonation.toFixed(2).substr(1) :
    intonation < 0 ? "- " + intonation.toFixed(2).substr(2) :
      "± .00";
}

function initHarmonicEntries(selector) {
  selector.each(function (_, element) {
    var selector = $(element);

    var harmonic = selector.index() + 1;
    var factored = factorHarmonic(harmonic);

    selector.find(".he-harmonic").text(harmonic);
    selector.find(".he-harmonic-odd").text(factored.odd);
    selector.find(".he-harmonic-exp").text(factored.exp);

    if (!$("#show-all-harmonics").prop("checked")) {
      if (harmonic % 2 == 0) {
        selector.hide();
      }

      selector.find(".he-harmonic-factors").hide();
    }
  });
}

function updateHarmonicEntries(selector, scale) {
  selector.each(function (_, element) {
    var selector = $(element);

    var harmonic = selector.index() + 1;
    var exactDegree = scale.toDegree(harmonic)
    var degree = Math.round(exactDegree);
    var intonation = exactDegree - degree;
    var absIntonation = Math.abs(intonation);

    var scaleFrequency = scale.scaleFrequency(degree);
    var harmonicFrequency = scale.harmonicFrequency(harmonic);

    selector.removeClass("list-group-item-secondary list-group-item-success list-group-item-warning list-group-item-danger");

    if (absIntonation <= .1) {
      selector.addClass("list-group-item-success");
    } else if (absIntonation <= .2) {
      selector.addClass("list-group-item-warning");
    } else {
      selector.addClass("list-group-item-danger");
    }

    selector.find(".he-degree").text((degree % scale.degrees) + 1);
    selector.find(".he-intonation").text(formatIntonation(intonation));
    selector.find(".he-sf").text(Math.round(scaleFrequency));
    selector.find(".he-hf").text(Math.round(harmonicFrequency));

    selector.data("scaleFrequency", scaleFrequency);
    selector.data("harmonicFrequency", harmonicFrequency);
  });
}

function playHarmonicEntries(selector) {
  if ($("#play-scale-tone").prop("checked")) {
    selector.each(function (_, element) {
      new Track().addTone($(element).data("scaleFrequency"), toneDuration).start();
    });
  }

  if ($("#play-harmonic").prop("checked")) {
    selector.each(function (_, element) {
      new Track().addTone($(element).data("harmonicFrequency"), toneDuration).start();
    });
  }
}

$(function () {
  $("#playFundamental").click(function () {
    new Track().addTone($("#fundamental").val(), toneDuration).start();
  });

  $("#playScale").click(function () {
    var scale = new Scale();
    while (scale.fundamental < 330) {
      scale.fundamental *= 2;
    }
    while (scale.fundamental > 660) {
      scale.fundamental /= 2;
    }

    var toneDuration = Math.max(.125, minScalePlaybackDuration / scale.degrees);

    var player = new Track();
    for (var i = 0; i < scale.degrees; ++i) {
      player.addTone(scale.scaleFrequency(i), toneDuration);
    }
    for (var i = scale.degrees; i >= 0; --i) {
      player.addTone(scale.scaleFrequency(i), toneDuration);
    }
    player.start();
  });

  $(".input-group:has(.play)").on("keypress", function (e) {
    if (e.which == 13) {
      $(this).closest(".input-group").find(".play").click();
    }
  });

  $("#adjustFundamental .btn").click(function () {
    var multiplier = $(this).data("fundamentalMultiplier");
    $("#fundamental").val(function (_, f) {
      return f *= multiplier;
    });
    updateScale();

    playSelected() || $("#playFundamental").click();
  });

  $("#scalePresets button").click(function () {
    $("#scale").val($(this).text());
    updateScale();

    playSelected() || $("#playScale").click();
  });

  var entryTemplate = $(".harmonics > *").detach();

  function updateScale() {
    var scale = new Scale();
    updateHarmonicEntries($(".harmonics > *"), scale);
  }

  $("#fundamental, #scale").change(updateScale);

  for (var i = 0; i < nHarmonics; ++i) {
    $(".harmonics").append(entryTemplate.clone());
  }
  initHarmonicEntries($(".harmonics > *"));
  updateScale();

  function playSelected() {
    var selected = $(".harmonics > *").filter(".active");
    playHarmonicEntries(selected);
    return selected.length > 0;
  }

  $(".harmonics").click(function (e) {
    $(e.target).closest(".list-group-item").toggleClass("active");
    playSelected();
  });

  $("#play-scale-tone, #play-harmonic").change(function () { playSelected(); });

  $("#show-all-harmonics").change(function () {
    var evens = $(".harmonics > :odd"); // because 0-indexed
    var factors = $(".he-harmonic-factors");
    var label = $(this).next();

    if (this.checked) {
      evens.show();
      factors.show();
      label.text("All harmonics");
    } else {
      evens.hide();
      evens.removeClass("active");
      factors.hide();
      label.text("Odd harmonics only");
    }
  });
});