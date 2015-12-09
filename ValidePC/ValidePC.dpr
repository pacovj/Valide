program ValidePC;

uses
  Vcl.Forms,
  Main in 'Main.pas' {Form1},
  ValideLogic in 'ValideLogic.pas';

{$R *.res}

begin
  Application.Initialize;
  Application.MainFormOnTaskbar := True;
  Application.CreateForm(TForm1, Form1);
  Application.Run;
end.
