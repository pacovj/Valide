var paises=[]
var limite=15;
var usos=[]
var selPaises;
var selUsos;

function toTitleCase(str)
{
	return str.charAt(0).toUpperCase() + str.substr(1);
}

function init()
{
	window.onbeforeunload = function (event) {
						askSomething("shutdown",{},doNothing,{});
				};
	askSomething("loadPaises",{},loadPaises,{});
	askSomething("loadUsos",{},loadUsos,{});

}

function paintCheck(etiqueta, options,target,colors)
{
	var h='<div class="etiqueta">'+etiqueta+'</div>'
	h+='<div class="coll2 left">'
	h+='<input type="checkbox" onchange="toggleAll(\''+target+'\',this)" checked>Todos<br>';
	var i=1;
	var j=0;
	for (option of options)
	{
		if(i>limite)
		{
			h+='</div>'
			h+='<div class="col2 right">'
			i=0;
		}
		color=colors[j];
		h+='<input type="checkbox" checked><span style="color:'+color+'">'+toTitleCase(option)+'</span><br>';
		i++;
		j++;
	}
	h+='</div>'
	$(target).html(h);
}

function loadPaises(data)
{
	paises=paises.concat(data);
	var check=[];
	var colors=[];
	for (pais of paises)
	{
		check.push(pais[0]);
		colors.push('black');
	}
	paintCheck('1) Selecciona los paises objetivo:',check,'#checkPaises',colors);
}

function loadUsos(data)
{
	usos=usos.concat(data);
	var check=[];
	var colors=[];
	for (uso of usos)
	{
		check.push(uso[0]);
		colors.push(uso[1]);
	}
	paintCheck('2) Selecciona los usos objetivo:',check,'#checkUsos',colors);
}

function toggleAll(id,me)
{
	$(id+" input[type='checkbox']").prop('checked',me.checked);
}

function askSomething(script,params,localHandler,localParams)
{
	$.ajax({
				method: "POST",
				url: script,
				data: params,
				local:localParams,
				success:function(data)
				{
					localHandler(JSON.parse(data));
				}
			}
		);
}

function doNothing(data)
{
}

function clickTab(id,object)
{
	$(".contenido").each(function()
		{
			if(!$(this).hasClass("invisible"))
			{
				$(this).toggleClass("invisible");
			}
		}
	);
	$(".selTab").each(function()
		{
			$(this).attr("class","tab");
		}
	);
	$("#"+id).toggleClass("invisible");
	$(object).toggleClass("selTab");
	if(id=='analiza')
	{
		analizaTexto();
	}
}

function analizaTexto()
{
	myEditor.updateWidgInput();
	selPaises=extractCheckValues("#checkPaises");
	selUsos=extractCheckValues("#checkUsos");
	var texto='<?xml version="1.0" encoding="UTF-8"?>';
	texto+="<target>"+myEditor.theInput.value+"</target>";
	$("#analiza").html("<p><b>El an&aacute;lisis no gener&oacute; resultados.</b></p>");
	if(texto.length<5)
	{
		alert('No has ingresado suficiente texto');
		return '';
	}
	if(selPaises.length<1)
	{
		alert('No seleccionaste paises');
		return '';
	}
	if(selUsos.length<1)
	{
		alert('No seleccionaste usos');
		return '';
	}
	$("#analiza").html("<div class='espera'><img src='loading.gif'/></div>");
	texto=limpiaUnicode(texto);
	alert(texto)
	askSomething("analiza",{Paises:vec2str(selPaises),Usos:vec2str(selUsos),text:texto},analiza,{});
}

function limpiaUnicode(texto)
{
	var t='';
	for(var i=0;i<texto.length;i++)
		if(texto.charCodeAt(i)<128)
		{
			t+=texto[i];
		}
		else
		{
			t+='|u'+String(texto.charCodeAt(i))+";";
		}
	return t;
}

function vec2str(vec)
{
	var str='';
	for(var i=0;i<vec.length;i++)
	{
		if(i>0)
		{
			str+=',';
		}
		str+=String(vec[i]);
	}
	return str;
}

function analiza(data)
{
	alert(data)
}

function extractCheckValues(id)
{
	var i=0;
	var sel=[];
	$(id+" input[type='checkbox']").each(function()
		{
			if(i>0&&this.checked)
			{
				sel.push(i-1);
			}
			i++;
		}
	);
	return sel;
}