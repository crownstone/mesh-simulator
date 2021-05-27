function getData(path, success, error) {
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        success(xhr.responseText, path);
      }
      else {
        if (error === undefined) {
          console.error("ERROR:", path)
        }
        else {
          error();
        }
      }
    }
  };
  xhr.open("GET", path, true);

  xhr.send();
}

function postCommand(path, success, error) {
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        success(xhr.responseText, path);
      }
      else {
        if (error === undefined) {
          console.error("ERROR:", path)
        }
        else {
          error();
        }
      }
    }
  };
  xhr.open("POST", path, true);

  xhr.send();
}

function validateTokenInput() {
  let value = TOKEN_INPUT.value;
  if (value.length === 64) {
    window.location.href = window.location.href + "?access_token="+value;
    TOKEN = value;
    TOKEN_INPUT_WRAPPER.style.display = 'none';
    GRAPH_WRAPPER.style.display = 'block';
    initVis();
    getAvailableData();
  }
}

let colors = {
  csBlue:               {hex:'#003E52'},
  csBlueDark:           {hex:'#00283c'},
  csBlueDarker:         {hex:'#00212b'},
  csBlueLight:          {hex:'#006f84'},
  csBlueLighter:        {hex:'#00b6cd'},
  csBlueLightDesat:     {hex:'#2c9aa8'},
  csOrange:             {hex:'#ff8400'},
  darkCsOrange:         {hex:'#d97500'},
  lightCsOrange:        {hex:'#ffa94d'},
  // menuBackground:       {hex:'#00263e'},
  menuBackground:       {hex:'#00283c'},
  menuBackgroundDarker: {hex:'#00172c'},
  // menuBackgroundDarker: {hex:'#001122'},
  menuText:             {hex:'#fff'},
  menuTextSelected:     {hex:'#3478f6'},
  menuTextSelectedDark: {hex:'#245da8'},
  white:                {hex:'#fff'},
  black:                {hex:'#000'},
  gray:                 {hex:'#ccc'},
  notConnected:         {hex:'#00283c'},
  darkGray:             {hex:'#555'},
  darkGray2:            {hex:'#888'},
  lightGray2:           {hex:'#dedede'},
  lightGray:            {hex:'#eee'},
  purple:               {hex:'#8a01ff'},
  darkPurple:           {hex:'#5801a9'},
  darkerPurple:         {hex:'#2a0051'},
  blue:                 {hex:'#2daeff'},
  blueDark:             {hex:'#2472ad'},
  blue2:                {hex:'#2698e9'},
  blue3:                {hex:'#0075c9'},
  green:                {hex:'#a0eb58'},
  lightGreen2:          {hex:'#bae97b'},
  lightGreen:           {hex:'#caff91'},
  green2:               {hex:'#4cd864'},
  darkGreen:            {hex:'#1f4c43'},
  red:                  {hex:'#ff3c00'},
  darkRed:              {hex:'#cc0900'},
  menuRed:              {hex:'#e00'},
  iosBlue:              {hex:'#007aff'},
  iosBlueDark:          {hex:'#002e5c'},
  lightBlue:            {hex:'#a9d0f1'},
  lightBlue2:           {hex:'#77c2f7'},
  blinkColor1:          {hex:'#2daeff'},
  blinkColor2:          {hex:'#a5dcff'},
  random: () => {}
};

for (let color in colors) {
  if (colors.hasOwnProperty(color)) {
    if (color !== "random") {
      populateColorObject(colors[color], color)
    }
  }
}


let allColors = Object.keys(colors);

colors.random = function() {
  return colors[allColors[Math.floor(Math.random()*allColors.length)]]
};

function populateColorObject(clr, color) {
  clr.name = color;
  clr.rgb = hex2rgb(clr.hex);
  clr.hsv = rgb2hsv(clr.rgb.r,clr.rgb.g,clr.rgb.b);
  clr.rgba = (opacity) => { opacity = Math.min(1,opacity); return 'rgba(' + clr.rgb.r + ',' + clr.rgb.g + ',' + clr.rgb.b + ',' + opacity + ')'};
  /**
   * Factor 0 means fully initial color, 1 means fully other color
   * @param otherColor
   * @param factor
   * @returns {{name: string; hex: string; rgb: {r: number; g: number; b: number}; rgba: (opacity) => string}}
   */
  clr.blend = (otherColor, factor) => {
    factor = Math.max(0,Math.min(1,factor));
    let red   = Math.floor((1-factor) * clr.rgb.r + factor * otherColor.rgb.r);
    let green = Math.floor((1-factor) * clr.rgb.g + factor * otherColor.rgb.g);
    let blue  = Math.floor((1-factor) * clr.rgb.b + factor * otherColor.rgb.b);
    return populateColorObject({hex:rgb2hex(red, green, blue)},'blend:'+color+"_"+otherColor.name+"_"+factor)
  };
  clr.hsvBlend = (otherColor, factor) => {
    factor = Math.max(0,Math.min(1,factor));
    let h = (1-factor) * clr.hsv.h + factor * otherColor.hsv.h;``;
    let s = (1-factor) * clr.hsv.s + factor * otherColor.hsv.s;
    let v = (1-factor) * clr.hsv.v + factor * otherColor.hsv.v;

    let newColor = hsv2hex(h,s,v);
    return populateColorObject({hex:newColor},'hsv_blend:'+color+"_"+otherColor.name+"_"+factor)
  };

  // clr.hsl = rgb2hsl(clr.rgb.r,clr.rgb.g,clr.rgb.b);
  // clr.hcl = rgb2hcl(clr.rgb.r,clr.rgb.g,clr.rgb.b);

  return clr;
}
