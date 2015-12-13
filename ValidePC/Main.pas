unit Main;

interface

uses
  ValideLogic,Winapi.Windows, Winapi.Messages, System.SysUtils, System.Variants, System.Classes, Vcl.Graphics,
  Vcl.Controls, Vcl.Forms, Vcl.Dialogs, FireDAC.Stan.Intf, FireDAC.Stan.Option,
  FireDAC.Stan.Error, FireDAC.UI.Intf, FireDAC.Phys.Intf, FireDAC.Stan.Def,
  FireDAC.Stan.Pool, FireDAC.Stan.Async, FireDAC.Phys, FireDAC.VCLUI.Wait,
  Data.DB, FireDAC.Comp.Client, Vcl.Imaging.jpeg, Vcl.ExtCtrls,
  FireDAC.Stan.ExprFuncs, FireDAC.Phys.SQLiteDef, FireDAC.Phys.SQLite,
  FireDAC.Stan.Param, FireDAC.DatS, FireDAC.DApt.Intf, FireDAC.DApt,
  Vcl.StdCtrls, Vcl.DBCtrls, FireDAC.Comp.DataSet, Vcl.Menus, Vcl.Buttons,
  Vcl.Imaging.pngimage, Vcl.ComCtrls, DateUtils,RichEdit,System.StrUtils,System.Generics.Collections,
  Vcl.AppEvnts, Vcl.CheckLst;

type
  TForm1 = class(TForm)
    Image1: TImage;
    sqliteDriver: TFDPhysSQLiteDriverLink;
    ValideBase: TFDConnection;
    Catalogos: TFDTable;
    Origen: TDataSource;
    GroupBox1: TGroupBox;
    Label1: TLabel;
    MainConnection: TFDConnection;
    Query: TFDQuery;
    Label2: TLabel;
    Label3: TLabel;
    PopupMenu1: TPopupMenu;
    Coloquial1: TMenuItem;
    Coloquialrestringido1: TMenuItem;
    Formal1: TMenuItem;
    General1: TMenuItem;
    Grosero1: TMenuItem;
    Pasivo1: TMenuItem;
    Image3: TImage;
    Image4: TImage;
    Image5: TImage;
    Image6: TImage;
    Image7: TImage;
    RichEdit1: TRichEdit;
    Morph: TFDTable;
    variante: TFDTable;
    varpaises: TFDTable;
    pais: TFDTable;
    DCatalogos: TDataSource;
    DBLookupComboBox1: TDBLookupComboBox;
    DBLookupComboBox2: TDBLookupComboBox;
    DBLookupComboBox3: TDBLookupComboBox;
    pais2: TFDTable;
    Destino: TDataSource;
    FileOpenDialog1: TFileOpenDialog;
    Color: TFDTable;
    FileSaveDialog1: TFileSaveDialog;
    Timer1: TTimer;
    synonimos: TPopupMenu;
    ApplicationEvents1: TApplicationEvents;
    Label4: TLabel;
    CheckListBox1: TCheckListBox;
    CheckListBox2: TCheckListBox;
    procedure FormCreate(Sender: TObject);
    procedure Image6Click(Sender: TObject);
    procedure FileOpenDialog1FileOkClick(Sender: TObject;
      var CanClose: Boolean);
    procedure CatalogosAfterScroll(DataSet: TDataSet);
    procedure DBLookupComboBox1Click(Sender: TObject);
    procedure RichEdit1Change(Sender: TObject);
    procedure Image4Click(Sender: TObject);
    procedure FileSaveDialog1FileOkClick(Sender: TObject;
      var CanClose: Boolean);
    procedure DBLookupComboBox2Click(Sender: TObject);
    procedure DBLookupComboBox3Click(Sender: TObject);
    procedure Image5Click(Sender: TObject);
    procedure Timer1Timer(Sender: TObject);
    procedure Coloquial1Click(Sender: TObject);
    procedure RichEdit1ContextPopup(Sender: TObject; MousePos: TPoint;
      var Handled: Boolean);
    procedure ApplicationEvents1ShortCut(var Msg: TWMKey; var Handled: Boolean);

  private
    { Private declarations }
  public
    { Public declarations }
    Load:Boolean;
    LastText:String;
    LastEdit:TDateTime;
    LastLine:Integer;
    VMemory:TObjectList<TObject>;//Variantes origen
    LMemory:TObjectList<TStrings>;//Longitudes variantes origen
    PMemory:TObjectList<TStrings>;//Posiciones
    TMemory:TObjectList<TStrings>;//Longitudes de token
    VDMemory:TObjectList<TObject>;//Variantes destino
    UMemory:TObjectList<TObject>;//Variantes destino
    UDMemory:TObjectList<TObject>;//Variantes destino
    LDMemory:TObjectList<TStrings>;//Longitudes variantes destino
    procedure subraya(uso:String);
    procedure refresh;
    procedure paintLine(line:Integer);
    procedure paintVariante(line:Integer;variantes:TObjectList<TStrings>;list:TStrings;pos:TStrings;tipo:Boolean;Clength:TStrings);
    procedure pinta(uso:String;tipo:Boolean);
    procedure siguienteMarca();
    procedure marcaAnterior();
    procedure selectMarca(LineNo:Integer;pos:Integer);
    procedure translate(Sender: TObject);
    procedure filtraUsos(usos:TStrings);
  end;

var
  Form1: TForm1;

implementation

{$R *.dfm}

procedure TForm1.filtraUsos(usos:TStrings);
var
  i:Integer;
  j:Integer;
begin
  for j := 0 to Form1.CheckListBox1.Items.Count-1 do
    begin
      if (not Form1.CheckListBox1.Checked[j]) and (usos.Count>0) then
      begin
        Color.First;
        Color.Locate('Uso',AnsiLowerCase(Form1.CheckListBox1.Items[j]),[]);
        i:=AnsiIndexStr(Color.FieldByName('Clave_Uso').AsString,usos.ToStringArray);
        if i>=0 then
          usos.Delete(i);
      end;
    end;
  for j := 0 to Form1.CheckListBox2.Items.Count-1 do
    begin
      if (not Form1.CheckListBox2.Checked[j]) and (usos.Count>0) then
      begin
        Color.First;
        Color.Locate('Uso',AnsiLowerCase(Form1.CheckListBox2.Items[j]),[]);
        i:=AnsiIndexStr(Color.FieldByName('Clave_Uso').AsString,usos.ToStringArray);
        if i>=0 then
          usos.Delete(i);
      end;
    end;
end;

procedure TForm1.translate(Sender: TObject);
var
  item:tMenuItem;
  LineNo:Integer;
  LinePos:Integer;
  pos:Integer;

begin

  LineNo:=RichEdit1.Perform(EM_LINEFROMCHAR, RichEdit1.SelStart, 0);
  LinePos:=RichEdit1.Perform(EM_LineIndex,LineNo,0);
  LinePos:=RichEdit1.SelStart-LinePos;
  pos:=1;
  while (pos<PMemory[LineNo].Count) and (StrToInt(PMemory[LineNo][pos])<LinePos) do
  begin
   pos:=pos+1;
  end;
  pos:=pos-1;
  while (pos>0) and ((StrToInt(LMemory[LineNo][pos])<0) or (StrToInt(LDMemory[LineNo][pos])<0)) do
  begin
    pos:=pos-1;
  end;
  RichEdit1.Enabled:=false;
  RichEdit1.OnChange:=nil;
  selectMarca(LineNo,pos);
  item:=(Sender as tMenuItem);
  RichEdit1.SelText:=AnsiMidStr(item.Caption,2,Length(item.Caption)-1);
  RichEdit1.SelLength:=0;
  RichEdit1.Enabled:=true;
  RichEdit1.OnChange:=Form1.RichEdit1Change;
end;


procedure TForm1.ApplicationEvents1ShortCut(var Msg: TWMKey;
  var Handled: Boolean);
begin
  if (Msg.CharCode = Ord('N'))  and  (GetKeyState(VK_CONTROL) < 0) then
  begin
    Form1.siguienteMarca;
    Handled := true;
  end;
  if (Msg.CharCode = Ord('B'))  and  (GetKeyState(VK_CONTROL) < 0) then
  begin
    Form1.marcaAnterior;
    Handled := true;
  end;
end;

procedure TForm1.CatalogosAfterScroll(DataSet: TDataSet);
begin
   if Form1.Load then
   begin
     Form1.Load:=false;
     loadFromDump(DBLookupComboBox1.KeyValue,Form1.Catalogos,Form1.Query,Form1.MainConnection);
     Pais.Active:=true;
     Pais2.Active:=true;
     Color.Active:=true;
     Form1.DBLookupComboBox2.KeyValue:='M�xico';
     Form1.DBLookupComboBox3.KeyValue:='Argentina';
     loadDictionary(Form1.Morph);
     loadCollocations(Form1.Catalogos,Form1.Query,Form1.variante,Form1.Morph);
   end;
end;

procedure TForm1.Coloquial1Click(Sender: TObject);
var
  s:TMenuItem;
begin
  Form1.PopupMenu1.Popup(Form1.PopupMenu1.PopupPoint.X,PopupMenu1.PopupPoint.Y);
  s:=(Sender as TMenuItem);
  if s.Checked then
    s.Checked:=false
  else
    s.Checked:=true;

end;

procedure TForm1.DBLookupComboBox1Click(Sender: TObject);
begin
  Form1.refresh;
end;

procedure TForm1.DBLookupComboBox2Click(Sender: TObject);
begin
  Form1.refresh;
end;

procedure TForm1.DBLookupComboBox3Click(Sender: TObject);
begin
  Form1.refresh;
end;

procedure TForm1.FileOpenDialog1FileOkClick(Sender: TObject;
  var CanClose: Boolean);
var
  myFile : TextFile;
  text   : string;
  i: Integer;
begin
  AssignFile(myFile, Form1.FileOpenDialog1.FileName);
  Reset(myFile);
  Form1.RichEdit1.OnChange:=nil;
  Form1.RichEdit1.Clear;
  i:=0;
  while not Eof(myFile) do
  begin
    ReadLn(myFile, text);
    Form1.RichEdit1.Enabled:=false;
    Form1.RichEdit1.OnChange:=nil;
    Form1.RichEdit1.Lines.Append(text);
    Form1.paintLine(i);
    Form1.RichEdit1.Enabled:=true;
    i:=i+1;
  end;
  Form1.RichEdit1.OnChange:=Form1.RichEdit1Change;
  Form1.RichEdit1.SelStart:=0;
  // Close the file for the last time
  CloseFile(myFile);
end;

procedure TForm1.FileSaveDialog1FileOkClick(Sender: TObject;
  var CanClose: Boolean);
begin
  RichEdit1.Lines.SaveToFile(FileSaveDialog1.FileName);
end;

procedure TForm1.FormCreate(Sender: TObject);
var
  i:Integer;
begin
  for i := 0 to Form1.CheckListBox1.Items.Count-1 do
  begin
    Form1.CheckListBox1.Checked[i]:=true;
  end;
    for i := 0 to Form1.CheckListBox2.Items.Count-1 do
  begin
    Form1.CheckListBox2.Checked[i]:=true;
  end;
  Form1.CheckListBox1.OnClickCheck:=DBLookupComboBox2Click;
  Form1.CheckListBox2.OnClickCheck:=DBLookupComboBox2Click;
  Form1.ValideBase.Connected:=false;
  Form1.ValideBase.Params.DriverID:='SQLite';
  Form1.ValideBase.Params.Database:='$(RUN)/dbs/valide';
  Form1.ValideBase.Connected:=true;
  Form1.Catalogos.Active:=true;
  Form1.Load:=true;
  Form1.DBLookupComboBox1.KeyValue:='ValideANA';
  Form1.LastEdit:=Now;
  Form1.LastLine:=RichEdit1.Perform(EM_LINEFROMCHAR, RichEdit1.SelStart, 0);
  VMemory:=TObjectList<TObject>.Create();
  UMemory:=TObjectList<TObject>.Create();
  LMemory:=TObjectList<TStrings>.Create();
  TMemory:=TObjectList<TStrings>.Create();
  PMemory:=TObjectList<TStrings>.Create();
  VDMemory:=TObjectList<TObject>.Create();
  UDMemory:=TObjectList<TObject>.Create();
  LDMemory:=TObjectList<TStrings>.Create();
end;


procedure TForm1.Image4Click(Sender: TObject);
begin
  Form1.FileOpenDialog1.Execute;
end;

procedure TForm1.Image5Click(Sender: TObject);
begin
  RichEdit1.Print('Valide Job');
end;

procedure TForm1.Image6Click(Sender: TObject);
begin
  Form1.RichEdit1.OnChange:=nil;
  Timer1.Enabled:=false;
  RichEdit1.Clear;
  Form1.RichEdit1.OnChange:=Form1.RichEdit1Change;
end;

procedure TForm1.RichEdit1Change(Sender: TObject);
var
  LineNo:Integer;
begin
  Form1.LastEdit:=Now;
  LineNo:=RichEdit1.Perform(EM_LINEFROMCHAR, RichEdit1.SelStart, 0);
  if (Form1.LastLine<>LineNo) and (Form1.LastText<>RichEdit1.Lines[Form1.LastLine]) then
  begin
    paintLine(LastLine);
  end;
  if not Timer1.Enabled then
     Timer1.Enabled:=true;
  Form1.LastEdit:=Now;
end;

procedure TForm1.RichEdit1ContextPopup(Sender: TObject; MousePos: TPoint;
  var Handled: Boolean);
var
  item:tMenuItem;
  pitem:tMenuItem;
  sitem:tMenuItem;
  uitem:tMenuItem;
  LineNo:Integer;
  LinePos:Integer;
  pos:Integer;
  synOrigen:TObjectList<TStrings>;
  synDestino:TObjectList<TStrings>;
  lvariante:TStrings;
  conceptos:TStrings;
  i:Integer;
  j:Integer;
  basePos:Integer;
 begin
  RichEdit1.SelStart:=RichEdit1.Perform(EM_CHARFROMPOS, 0, Integer(@MousePos));
  LineNo:=RichEdit1.Perform(EM_LINEFROMCHAR, RichEdit1.SelStart, 0);
  LinePos:=RichEdit1.Perform(EM_LineIndex,LineNo,0);
  LinePos:=RichEdit1.SelStart-LinePos;
  synonimos.Items.Clear;
  lvariante:=TStringList.Create;
  if LineNo<VMemory.Count then
  begin
     pos:=1;
     while (pos<PMemory[LineNo].Count) and (StrToInt(PMemory[LineNo][pos])<LinePos) do
     begin
       pos:=pos+1;
     end;
     pos:=pos-1;
     basePos:=pos;
     conceptos:=TStringList.Create;
     synOrigen:=TObjectList<TStrings>.Create();
     synDestino:=TObjectList<TStrings>.Create();

     //arma el menu traduccion
     if StrToInt(LMemory[LineNo][pos])<>0 then
     begin
        while StrToInt(LMemory[LineNo][pos])<0 do
        begin
          pos:=pos-1;
        end;
        getConceptos((VMemory[LineNo] as TObjectList<TStrings>)[pos],'N/A',pais2.FieldByName('Clave_Pais').AsString,Form1.variante,varpaises,Form1.Query,conceptos,synOrigen,synDestino);
        if conceptos.Count>0 then
        begin
          uitem:=tMenuItem.Create(synonimos);
          uitem.Caption:='Traducir ('+Form1.DBLookupComboBox2.KeyValue+'/'+Form1.DBLookupComboBox3.KeyValue+')';
          synonimos.Items.Add(uitem);
          for i := 0 to conceptos.Count-1 do
          begin
            item:=tMenuItem.Create(synonimos);
            item.Caption:=conceptos[i];
            uitem.Add(item);
            for j := 0 to synDestino[i].Count-1 do
            begin
               sItem:=tMenuItem.Create(synonimos);
               sItem.Caption:=synDestino[i][j];
               sItem.OnClick:=Form1.translate;
               item.Add(sitem);
            end;
          end;
        end;
     end;

     //Arma el menu de sinonimos
     conceptos.Clear;
     synOrigen.Clear;
     synDestino.Clear;

     pos:=basePos;
     if StrToInt(LDMemory[LineNo][pos])<>0 then
     begin
        while StrToInt(LDMemory[LineNo][pos])<0 do
        begin
          pos:=pos-1;
        end;
        getConceptos((VDMemory[LineNo] as TObjectList<TStrings>)[pos],'N/A',pais2.FieldByName('Clave_Pais').AsString,Form1.variante,varpaises,Form1.Query,conceptos,synOrigen,synDestino);
        if conceptos.Count>0 then
        begin
          uitem:=tMenuItem.Create(synonimos);
          uitem.Caption:='Sin�nimos ('+Form1.DBLookupComboBox3.KeyValue+')';
          synonimos.Items.Add(uitem);
          for i := 0 to conceptos.Count-1 do
          begin
            item:=tMenuItem.Create(synonimos);
            item.Caption:=conceptos[i];
            uitem.Add(item);
            for j := 0 to synDestino[i].Count-1 do
            begin
               sItem:=tMenuItem.Create(synonimos);
               sItem.Caption:=synDestino[i][j];
               sItem.OnClick:=Form1.translate;
               item.Add(sitem);
            end;
          end;
        end;
     end;
     //Arma el menu cambio libre
     conceptos.Clear;
     synOrigen.Clear;
     synDestino.Clear;
     pos:=basePos;
     if StrToInt(LMemory[LineNo][pos])<>0 then
     begin
        while StrToInt(LMemory[LineNo][pos])<0 do
        begin
          pos:=pos-1;
        end;
     end;
     lvariante.AddStrings((VMemory[LineNo] as TObjectList<TStrings>)[pos]);
     pos:=basePos;
     if StrToInt(LDMemory[LineNo][pos])<>0 then
     begin
        while StrToInt(LDMemory[LineNo][pos])<0 do
        begin
          pos:=pos-1;
        end;
     end;
     lvariante.AddStrings((VDMemory[LineNo] as TObjectList<TStrings>)[pos]);
     if lvariante.Count>0 then
     begin
        getConceptos(lvariante,pais.FieldByName('Clave_Pais').AsString,pais2.FieldByName('Clave_Pais').AsString,Form1.variante,varpaises,Form1.Query,conceptos,synOrigen,synDestino);
        if conceptos.Count>0 then
        begin
          uitem:=tMenuItem.Create(synonimos);
          uitem.Caption:='Cambio libre';
          synonimos.Items.Add(uitem);
          for i := 0 to conceptos.Count-1 do
          begin
            item:=tMenuItem.Create(synonimos);
            item.Caption:=conceptos[i];
            uitem.Add(item);
            if synOrigen[i].Count > 0 then
            begin
               pItem:=tMenuItem.Create(synonimos);
               pItem.Caption:=Form1.DBLookupComboBox2.KeyValue;
               item.Add(pItem);
               for j := 0 to synOrigen[i].Count-1 do
               begin
                 sItem:=tMenuItem.Create(synonimos);
                 sItem.Caption:=synOrigen[i][j];
                 sItem.OnClick:=Form1.translate;
                 pItem.Add(sitem);
               end;
            end;
            if synDestino[i].Count > 0 then
            begin
               pItem:=tMenuItem.Create(synonimos);
               pItem.Caption:=Form1.DBLookupComboBox3.KeyValue;
               item.Add(pItem);
               for j := 0 to synDestino[i].Count-1 do
               begin
                 sItem:=tMenuItem.Create(synonimos);
                 sItem.Caption:=synDestino[i][j];
                 sItem.OnClick:=Form1.translate;
                 pItem.Add(sitem);
               end;
            end;
          end;
        end;
     end;

  end;
  lvariante.Free;
end;

procedure TForm1.selectMarca(LineNo:Integer;pos:Integer);
var
   j:Integer;
begin
  RichEdit1.SelStart:=RichEdit1.Perform(EM_LineIndex,LineNo,0)+StrToInt(PMemory[LineNo][pos]);
  RichEdit1.SelLength:=0;
  j:=0;
  while (pos+j+1<PMemory[LineNo].Count) and (j< StrToInt(LMemory[LineNo][pos])-1) do
  begin
    RichEdit1.SelLength:=RichEdit1.SelLength+StrToInt(PMemory[LineNo][pos+j+1])-StrToInt(PMemory[LineNo][pos+j]);
    j:=j+1;
  end;
  RichEdit1.SelLength:=RichEdit1.SelLength+StrToInt(TMemory[LineNo][pos+j]);
end;

procedure TForm1.siguienteMarca;
var
  LineNo:Integer;
  LinePos:Integer;
  pos:Integer;
  ban:Boolean;

begin
  RichEdit1.SetFocus;
  if RichEdit1.SelLength>0 then
  begin
    pos:=RichEdit1.SelLength;
    RichEdit1.SelLength:=0;
    RichEdit1.SelStart:=RichEdit1.SelStart+pos;
  end;
  LineNo:=RichEdit1.Perform(EM_LINEFROMCHAR, RichEdit1.SelStart, 0);
  LinePos:=RichEdit1.Perform(EM_LineIndex,LineNo,0);
  LinePos:=RichEdit1.SelStart-LinePos;
  pos:=1;
  while (pos<PMemory[LineNo].Count) and (StrToInt(PMemory[LineNo][pos])<LinePos) do
  begin
    pos:=pos+1;
  end;
  if pos=PMemory[LineNo].Count then
  begin
   LineNo:=LineNo+1;
   pos:=0;
  end;

  ban:=false;
  while LineNo<LMemory.Count do
  begin
    while pos<PMemory[LineNo].Count do
    begin
      if (StrToInt(LMemory[LineNo][pos])>0) or (StrToInt(LDMemory[LineNo][pos])>0) then
      begin
        ban:=true;
        break;
      end;
      pos:=pos+1;
    end;
    if ban then
       break;
    LineNo:=LineNo+1;
    pos:=0;
  end;
  if ban then
  begin
    selectMarca(LineNo,pos);
  end
  else
  begin
    ShowMessage('No se encontr� otra palabra marcada');
  end;
end;

procedure TForm1.marcaAnterior;
var
  LineNo:Integer;
  LinePos:Integer;
  pos:Integer;
  ban:Boolean;

begin
  RichEdit1.SetFocus;
  if RichEdit1.SelLength>0 then
  begin
    RichEdit1.SelLength:=0;
  end;
  LineNo:=RichEdit1.Perform(EM_LINEFROMCHAR, RichEdit1.SelStart, 0);
  LinePos:=RichEdit1.Perform(EM_LineIndex,LineNo,0);
  LinePos:=RichEdit1.SelStart-LinePos;
  pos:=1;
  while (pos<PMemory[LineNo].Count) and (StrToInt(PMemory[LineNo][pos])<LinePos) do
  begin
    pos:=pos+1;
  end;
  pos:=pos-2;
  if pos<0 then
  begin
   LineNo:=LineNo-1;
   pos:=PMemory[LineNo].Count-1;
  end;

  ban:=false;
  while LineNo>=0 do
  begin
    while pos>=0 do
    begin
      if (StrToInt(LMemory[LineNo][pos])>0) or (StrToInt(LDMemory[LineNo][pos])>0) then
      begin
        ban:=true;
        break;
      end;
      pos:=pos-1;
    end;
    if ban then
       break;
    LineNo:=LineNo-1;
    if LineNo>=0 then
      pos:=PMemory[LineNo].Count-1;;
  end;
  if ban then
  begin
    selectMarca(LineNo,pos);
  end
  else
  begin
    ShowMessage('No se encontr� otra palabra marcada');
  end;
end;

procedure TForm1.subraya(uso:String);
var
  Format:CHARFORMAT2;
  AColor:Byte;

const
  CFU_UNDERLINETHICK = 9;
  CFU_UNDERLINEWAVE = 8;
  CFU_UNDERLINEDASHDOTDOT = 7;
  CFU_UNDERLINEDASHDOT = 6;
  CFU_UNDERLINEDASH = 5;
  CFU_UNDERLINEDOTTED = 4;
  CFU_UNDERLINE = 1;
  CFU_UNDERLINENONE = 0;
  U_Black =$00;
  U_Blue = $10;
  U_Aqua = $20;
  U_Lime = $30;
  U_Fuchsia = $40;
  U_Red = $50;
  U_Yellow = $60;
  U_White = $70;
  U_Navy = $80;
  U_Teal = $90;
  U_Green = $A0;
  U_Purple = $B0;
  U_Maroon =  $C0;
  U_Olive = $D0;
  U_DkGray = $E0;
  U_LtGray =  $F0;

begin
    case AnsiIndexStr(uso,['co','cr','fo','ge','gr','pa','normal']) of
        0:AColor:=U_Green;
        1:AColor:=U_Yellow;
        2:AColor:=U_Aqua;
        3:AColor:=U_Blue;
        4:AColor:=U_Red;
        5:AColor:=U_DkGray;
        6:AColor:=U_Black;
        else
          AColor:=U_LtGray;
    end;

    FillChar(Format, SizeOf(Format), 0);
    with Format do
    begin
       cbSize := SizeOf(Format);
       dwMask := CFM_UNDERLINETYPE;
       if uso<>'normal' then
       begin
         bUnderlineType := CFU_UNDERLINE or AColor;
       end
       else
       begin
         bUnderlineType:= CFU_UNDERLINENONE or AColor;
       end;
       Form1.RichEdit1.Perform(EM_SETCHARFORMAT, SCF_SELECTION, Longint(@Format));
    end;
end;

procedure TForm1.Timer1Timer(Sender: TObject);
begin
  if (DateUtils.MilliSecondsBetween(Now, Form1.LastEdit)>Timer1.Interval) and (Form1.LastLine<RichEdit1.Lines.Count) then
  begin
    if (RichEdit1.Lines[Form1.LastLine]<>'') and (Length(RichEdit1.Lines[Form1.LastLine])>2) then
    begin
      paintLine(Form1.LastLine);
      timer1.Enabled:=false;
    end;
  end;
end;

procedure TForm1.refresh;
var
  i:Integer;
begin
  Timer1.Enabled:=false;
  for i := 0 to RichEdit1.Lines.Count-1 do
  begin
    Form1.paintLine(i);
  end;
  Form1.RichEdit1.SelStart:=0;
  Timer1.Enabled:=true;
end;

procedure TForm1.paintLine(line:Integer);
var
  lemmas:TStrings;
  list:TStrings;
  old:Integer;
  i:Integer;
 begin
  if (line<Form1.RichEdit1.Lines.Count) and (Form1.RichEdit1.Lines[line]<>'') then
  begin
      Form1.RichEdit1.OnChange:=nil;
      if line>=VMemory.Count then
      begin
        VMemory.Add(TObjectList<TStrings>.Create());
        UMemory.Add(TObjectList<TStrings>.Create());
        LMemory.Add(TStringList.Create);
        PMemory.Add(TStringList.Create);
        TMemory.Add(TStringList.Create);
        VDMemory.Add(TObjectList<TStrings>.Create());
        UDMemory.Add(TObjectList<TStrings>.Create());
        LDMemory.Add(TStringList.Create);
      end
      else
      begin
        (VMemory[line] as TObjectList<TStrings>).Clear;
        (UMemory[line] as TObjectList<TStrings>).Clear;
        LMemory[line].Clear;
        PMemory[line].Clear;
        TMemory[line].Clear;
        (VDMemory[line] as TObjectList<TStrings>).Clear;
        (UDMemory[line] as TObjectList<TStrings>).Clear;
        LDMemory[line].Clear;
      end;
      lemmas:=TStringList.Create;
      list:=TStringList.Create;
      tokenizeMe(RichEdit1.Lines[line],PMemory[line],list);
      lemmatize(list,Form1.Morph,lemmas);


      for i := 0 to list.Count-1 do
      begin
         (VMemory[line] as TObjectList<TStrings>).Add(TStringList.Create());
         (UMemory[line] as TObjectList<TStrings>).Add(TStringList.Create());
         (VDMemory[line] as TObjectList<TStrings>).Add(TStringList.Create());
         (UDMemory[line] as TObjectList<TStrings>).Add(TStringList.Create());
         TMemory[line].Add(IntToStr(Length(list[i])));
      end;

      getVariantes(list,lemmas,Form1.variante,(VMemory[line] as TObjectList<TStrings>),'Clave_Pais='+QuotedStr(Pais.FieldByName('Clave_Pais').AsString),Form1.varpaises,LMemory[line]);
      getVariantes(list,lemmas,Form1.variante,(VDMemory[line] as TObjectList<TStrings>),'Clave_Pais='+QuotedStr(Pais2.FieldByName('Clave_Pais').AsString),Form1.varpaises,LDMemory[line]);
      lemmas.Free;
      RichEdit1.Enabled:=false;
      old:=RichEdit1.SelStart;
      RichEdit1.SelStart:=RichEdit1.perform(EM_LineIndex,line,0);
      RichEdit1.SelLength:=Length(RichEdit1.Lines[line]);
      RichEdit1.SelAttributes.Color:=clBlack;
      subraya('normal');
      RichEdit1.SelLength:=0;
      //pinta pais origen como color del texto
      paintVariante(line,(VMemory[line] as TObjectList<TStrings>),list,PMemory[line],true,LMemory[line]);
      //pinta pais destino como subrayado
      paintVariante(line,(VDMemory[line] as TObjectList<TStrings>),list,PMemory[line],false,LDMemory[line]);
      list.Free;
      RichEdit1.Enabled:=true;
      RichEdit1.SetFocus;
      RichEdit1.SelLength:=0;
      RichEdit1.SelStart:=old;
      RichEdit1.SelAttributes.Color:=clBlack;
      subraya('normal');
      Form1.LastLine:=line;
      Form1.LastText:=RichEdit1.Lines[line];
      Form1.RichEdit1.OnChange:=Form1.RichEdit1Change;

  end;
end;

procedure TForm1.pinta(uso:String;tipo:Boolean);
begin
  if Form1.Color.Locate('Clave_Uso',uso,[]) then
  begin
    if tipo then
      RichEdit1.SelAttributes.Color:=StringToColor(Form1.Color.FieldByName('Clave_Color').AsString)
    else
      subraya(uso);
  end
  else
    RichEdit1.SelAttributes.Style:=[fsBold];
end;

procedure TForm1.paintVariante(line:Integer;variantes:TObjectList<TStrings>;list:TStrings;pos:TStrings;tipo:Boolean;Clength:TStrings);
var
  usos:TStrings;
  i:Integer;
  idy:Integer;
  l:Integer;
  idx:Integer;
  j:Integer;
begin
  usos:=TStringList.Create;
  i := 0 ;
  while i<variantes.Count do
  begin
    if variantes[i].Count>0 then
    begin
      idx:=StrToInt(pos[i]);
      RichEdit1.SelStart:=RichEdit1.perform(EM_LineIndex,line,0)+idx;
      RichEdit1.SelLength:=Length(list[i]);
      j:=1;
      while j<StrToInt(Clength[i]) do
      begin
        idy:=StrToInt(pos[i+j]);
        l:=idy+Length(list[i+j])-idx-Length(list[i+j-1]);
        RichEdit1.SelLength:=RichEdit1.SelLength+l;
        idx:=idy;
        j:=j+1;
      end;
      usos.clear;
      getUsos(variantes[i],Pais.FieldByName('Clave_Pais').AsString,Form1.varpaises,usos);
      i:=i+StrToInt(Clength[i]);
      filtraUsos(usos);
      if usos.Count>0 then
      begin
        if usos.Count>1 then
        begin
           idx:=RichEdit1.SelLength div usos.Count;
           idy:=RichEdit1.SelLength mod usos.Count;
           j:=0;
           while j<usos.Count do
           begin
             if j<(usos.Count-1) then
             begin
               RichEdit1.SelLength:=idx;
             end
             else
             begin
               RichEdit1.SelLength:=idx+idy;
             end;
             pinta(usos[j],tipo);
             j:=j+1;
           end;

        end
        else
        begin
            pinta(usos[0],tipo);
        end;
      end
      else
      begin
        pinta('N/A',tipo);
      end;
    end
    else
      i:=i+1;
  end;

end;
end.
