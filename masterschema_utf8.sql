USE [master]
GO
/****** Object:  Database [brokermast]    Script Date: 13/08/2026 06:48:28 ******/
CREATE DATABASE [brokermast]
 CONTAINMENT = NONE
 ON  PRIMARY 
( NAME = N'brokermast', FILENAME = N'D:\softsolutions\SoftSauda\brokermast.mdf' , SIZE = 2432384KB , MAXSIZE = UNLIMITED, FILEGROWTH = 1024KB )
 LOG ON 
( NAME = N'brokermast_log', FILENAME = N'D:\softsolutions\SoftSauda\brokermast_log.ldf' , SIZE = 4224KB , MAXSIZE = UNLIMITED, FILEGROWTH = 10%)
 WITH CATALOG_COLLATION = DATABASE_DEFAULT, LEDGER = OFF
GO
ALTER DATABASE [brokermast] SET COMPATIBILITY_LEVEL = 100
GO
IF (1 = FULLTEXTSERVICEPROPERTY('IsFullTextInstalled'))
begin
EXEC [brokermast].[dbo].[sp_fulltext_database] @action = 'disable'
end
GO
ALTER DATABASE [brokermast] SET ANSI_NULL_DEFAULT OFF 
GO
ALTER DATABASE [brokermast] SET ANSI_NULLS OFF 
GO
ALTER DATABASE [brokermast] SET ANSI_PADDING OFF 
GO
ALTER DATABASE [brokermast] SET ANSI_WARNINGS OFF 
GO
ALTER DATABASE [brokermast] SET ARITHABORT OFF 
GO
ALTER DATABASE [brokermast] SET AUTO_CLOSE ON 
GO
ALTER DATABASE [brokermast] SET AUTO_SHRINK OFF 
GO
ALTER DATABASE [brokermast] SET AUTO_UPDATE_STATISTICS ON 
GO
ALTER DATABASE [brokermast] SET CURSOR_CLOSE_ON_COMMIT OFF 
GO
ALTER DATABASE [brokermast] SET CURSOR_DEFAULT  GLOBAL 
GO
ALTER DATABASE [brokermast] SET CONCAT_NULL_YIELDS_NULL OFF 
GO
ALTER DATABASE [brokermast] SET NUMERIC_ROUNDABORT OFF 
GO
ALTER DATABASE [brokermast] SET QUOTED_IDENTIFIER OFF 
GO
ALTER DATABASE [brokermast] SET RECURSIVE_TRIGGERS OFF 
GO
ALTER DATABASE [brokermast] SET  DISABLE_BROKER 
GO
ALTER DATABASE [brokermast] SET AUTO_UPDATE_STATISTICS_ASYNC OFF 
GO
ALTER DATABASE [brokermast] SET DATE_CORRELATION_OPTIMIZATION OFF 
GO
ALTER DATABASE [brokermast] SET TRUSTWORTHY OFF 
GO
ALTER DATABASE [brokermast] SET ALLOW_SNAPSHOT_ISOLATION OFF 
GO
ALTER DATABASE [brokermast] SET PARAMETERIZATION SIMPLE 
GO
ALTER DATABASE [brokermast] SET READ_COMMITTED_SNAPSHOT OFF 
GO
ALTER DATABASE [brokermast] SET HONOR_BROKER_PRIORITY OFF 
GO
ALTER DATABASE [brokermast] SET RECOVERY SIMPLE 
GO
ALTER DATABASE [brokermast] SET  MULTI_USER 
GO
ALTER DATABASE [brokermast] SET PAGE_VERIFY CHECKSUM  
GO
ALTER DATABASE [brokermast] SET DB_CHAINING OFF 
GO
ALTER DATABASE [brokermast] SET FILESTREAM( NON_TRANSACTED_ACCESS = OFF ) 
GO
ALTER DATABASE [brokermast] SET TARGET_RECOVERY_TIME = 0 SECONDS 
GO
ALTER DATABASE [brokermast] SET DELAYED_DURABILITY = DISABLED 
GO
ALTER DATABASE [brokermast] SET ACCELERATED_DATABASE_RECOVERY = OFF  
GO
ALTER DATABASE [brokermast] SET QUERY_STORE = OFF
GO
USE [brokermast]
GO
/****** Object:  User [sa]    Script Date: 13/08/2026 06:48:28 ******/
CREATE USER [sa] FOR LOGIN [NT AUTHORITY\SYSTEM] WITH DEFAULT_SCHEMA=[db_owner]
GO
/****** Object:  UserDefinedFunction [dbo].[AmountToWords]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO





create function [dbo].[AmountToWords]
	(
		@InNumber Numeric(18,2) 
	) 
--Returns the number as words.
returns VARCHAR(2000) 
as
BEGIN
--SEt NoCount ON
Declare @Num Varchar(20)
Declare @Dec Varchar(3)
Declare @Return Varchar(2000)      

set @Return = ' '
If @InNumber >= 100000 
begin
  set @Return = dbo.LESS100(convert(int,(@InNumber / 100000) ),@Return)
  set @InNumber = @InNumber - (convert(int,(@InNumber / 100000)) * 100000)
  set @Return = @Return + ' ' + dbo.GetTextValue(102)
End 
If @InNumber >= 1000 
begin
  set @Return = dbo.LESS100 (convert(int,(@InNumber / 1000)),@Return)
  set @InNumber = @InNumber - (convert(int,(@InNumber / 1000)) * 1000)
  set @Return = @Return +' ' + dbo.GetTextValue(101)
End
If @InNumber >= 100 
begin
  set @Return = dbo.LESS100(convert(int,(@InNumber / 100)),isnull(@Return,''))
  set @InNumber = @InNumber - (convert(int,(@InNumber / 100)) * 100)
  set @Return = @Return + ' ' + dbo.GetTextValue(100)
End 
set @Return = dbo.LESS100 (@InNumber,@Return)

If @Dec <> '.00'
begin
	Set @Return = @Return + 'And ' + dbo.GetTextValue(SubString(@Dec,2,2)) 	+ 'Paise'	
end

Return @Return
End






----------------



------------------





GO
/****** Object:  UserDefinedFunction [dbo].[GetTextValue]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO





Create Function [dbo].[GetTextValue]
(
	@dblNumber Numeric
)
Returns Varchar(1000) 
As
Begin
Declare @StrWord Varchar(400)
SEt @strWord = Case @dblNumber 

	When 0 Then ''
	When 1 Then 'One '
	When 2 Then 'Two '
	When 3 Then 'Three '
	When 4 Then 'Four '
	When 5 Then 'Five '
	When 6 Then 'Six '
	When 7 Then 'Seven '
	When 8 Then 'Eight '
	When 9 Then 'Nine '
	When 10 Then 'Ten '
	When 11 Then 'Eleven '
	When 12 Then 'Twelve '
	When 13 Then 'Thirteen '
	When 14 Then 'Fourteen '
	When 15 Then 'Fifteen '
	When 16 Then 'Sixteen '
	When 17 Then 'Seventeen '
	When 18 Then 'Eighteen '
	When 19 Then 'Nineteen '
	When 20 Then 'Twenty '
	When 30 Then 'Thirty '
	When 40 Then 'Fourty '
	When 50 Then 'Fifty '
	When 60 Then 'Sixty '
	When 70 Then 'Seventy '
	When 80 Then 'Eighty '
	When 90 Then 'Ninety '
	When 100 Then 'Hundred '
	When 101 Then 'Thousand '
	When 102 Then 'Lakh '

End

Return @strWord
End

GO
/****** Object:  UserDefinedFunction [dbo].[LESS100]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO




Create Function [dbo].[LESS100]
(
	@dblNumber Numeric,@WORDS Varchar(1000) 
)
Returns Varchar(1000) 
As
Begin
DECLARE @N1 Numeric,@n Numeric

If @dblNumber <= 20 
  begin
    set @WORDS = @WORDS + ' ' + dbo.GetTextValue(@dblNumber)
  end
If @dblNumber > 20 
  begin
    set @N1 = convert(int, (@dblNumber / 10))
    set @N1 = @N1 * 10
    select @WORDS = @WORDS + ' ' + dbo.GetTextValue(@N1)
    select @dblNumber= @dblNumber- @N1
    select @WORDS = @WORDS + ' '+ isnull(dbo.GetTextValue(@dblNumber),'')
  end
return @WORDS
end


GO
/****** Object:  UserDefinedFunction [dbo].[udf_TitleCase]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE FUNCTION [dbo].[udf_TitleCase] (@InputString VARCHAR(4000) )
RETURNS VARCHAR(4000)
AS
BEGIN
DECLARE @Index INT
DECLARE @Char CHAR(1)
DECLARE @OutputString VARCHAR(255)
SET @OutputString = LOWER(@InputString)
SET @Index = 2
SET @OutputString =
STUFF(@OutputString, 1, 1,UPPER(SUBSTRING(@InputString,1,1)))
WHILE @Index <= LEN(@InputString)
BEGIN
SET @Char = SUBSTRING(@InputString, @Index, 1)
IF @Char IN (' ', ';', ':', '!', '?', ',', '.', '_', '-', '/', '&','''','(')
IF @Index + 1 <= LEN(@InputString)
BEGIN
IF @Char != ''''
OR
UPPER(SUBSTRING(@InputString, @Index + 1, 1)) != 'S'
SET @OutputString =
STUFF(@OutputString, @Index + 1, 1,UPPER(SUBSTRING(@InputString, @Index + 1, 1)))
END
SET @Index = @Index + 1
END
RETURN ISNULL(@OutputString,'')
END
GO
/****** Object:  Table [dbo].[account_det]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[account_det](
	[sno] [int] IDENTITY(1,1) NOT NULL,
	[ac_sno] [int] NULL,
	[inch_nm] [char](50) NULL,
	[add_1] [char](50) NULL,
	[add_2] [char](50) NULL,
	[city] [int] NULL,
	[phoneno] [char](50) NULL,
	[mobno] [char](50) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[accountmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[accountmst](
	[sno] [int] IDENTITY(1,1) NOT NULL,
	[ac_name] [char](50) NULL,
	[ac_add1] [char](250) NULL,
	[ac_add2] [char](60) NULL,
	[ac_area] [char](40) NULL,
	[ac_place] [int] NULL,
	[ac_pin] [char](6) NULL,
	[ac_sie] [char](1) NULL,
	[ac_cont] [char](50) NULL,
	[ac_pho] [char](50) NULL,
	[ac_phr] [char](50) NULL,
	[ac_phm] [char](50) NULL,
	[ac_tin] [char](50) NULL,
	[ac_pan] [char](50) NULL,
	[ac_email] [char](50) NULL,
	[g_sno] [int] NULL,
	[chr_code] [char](5) NULL,
	[bill_prty] [int] NULL,
	[p_type] [char](10) NULL,
	[rmk] [char](150) NULL,
	[ac_pho1] [char](25) NULL,
	[ac_vat] [char](50) NULL,
	[ac_pho2] [char](30) NULL,
	[ac_pho3] [char](30) NULL,
	[ac_phr1] [char](30) NULL,
	[ac_phm1] [char](30) NULL,
	[ac_cont1] [char](50) NULL,
	[ac_grp] [char](25) NULL,
	[ac_delvnm] [char](50) NULL,
	[ac_delvadd1] [char](50) NULL,
	[ac_delvadd2] [char](50) NULL,
	[ac_delvplace] [int] NULL,
	[ac_delvpin] [char](6) NULL,
	[ac_delvsie] [char](1) NULL,
	[ac_delvtin] [char](50) NULL,
	[ac_delvpan] [char](50) NULL,
	[ac_delvvat] [char](50) NULL,
	[ac_delvpho1] [char](30) NULL,
	[ac_delvpho2] [char](30) NULL,
	[ac_delvphm1] [char](30) NULL,
	[ac_delvphm2] [char](30) NULL,
	[ac_bnkac1] [char](30) NULL,
	[ac_bnkac2] [char](30) NULL,
	[ac_bnkac3] [char](30) NULL,
	[ac_bnk1] [int] NULL,
	[ac_bnk2] [int] NULL,
	[ac_bnk3] [int] NULL,
	[ac_email1] [char](50) NULL,
	[ac_web] [char](50) NULL,
	[ac_cate] [char](1) NULL,
	[ac_work] [char](1) NULL,
	[ac_mail] [char](1) NULL,
	[ac_contfrm1] [char](25) NULL,
	[ac_contfrm2] [char](25) NULL,
	[ac_contfrm3] [char](25) NULL,
	[ac_contfrm4] [char](25) NULL,
	[ac_email2] [char](50) NULL,
	[ac_email3] [char](50) NULL,
	[ac_cont2] [char](50) NULL,
	[ac_cont3] [char](50) NULL,
	[ac_ssevausr] [char](25) NULL,
	[ac_ssevapwd] [char](10) NULL,
	[ac_clbald] [money] NULL,
	[ac_clbalc] [money] NULL,
	[ac_opbald] [money] NULL,
	[ac_opbalc] [money] NULL,
	[ac_perd] [money] NULL,
	[ac_perc] [money] NULL,
	[ac_limit] [money] NULL,
	[ac_gstin] [char](50) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[bankmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS OFF
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[bankmst](
	[sno] [int] IDENTITY(1,1) NOT NULL,
	[bnk_name] [char](100) NULL,
	[bnk_brnch] [char](50) NULL,
	[bnk_ifsc] [char](25) NULL,
	[bnk_micr] [char](50) NULL,
	[bnk_add] [char](200) NULL,
	[bnk_add1] [char](100) NULL,
	[bnk_center] [char](200) NULL,
	[bnk_cont] [char](200) NULL,
	[bnk_dist] [char](50) NULL,
	[bnk_state] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[brandmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS OFF
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[brandmst](
	[sno] [int] IDENTITY(1,1) NOT NULL,
	[brand_name] [char](50) NULL,
	[brand_regyn] [char](1) NULL,
	[brand_regno] [char](35) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[brandstp]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS OFF
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[brandstp](
	[sno] [int] IDENTITY(1,1) NOT NULL,
	[br_sno] [int] NULL,
	[br_pack] [money] NULL,
	[br_ipack] [char](35) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[coumst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[coumst](
	[sno] [int] IDENTITY(1,1) NOT NULL,
	[ac_name] [char](50) NULL,
	[ac_add1] [char](50) NULL,
	[ac_add2] [char](50) NULL,
	[ac_place] [int] NULL,
	[ac_pin] [char](6) NULL,
	[ac_cont] [char](50) NULL,
	[ac_pho] [char](50) NULL,
	[ac_phr] [char](50) NULL,
	[ac_phm] [char](50) NULL,
	[ac_tin] [char](50) NULL,
	[ac_pan] [char](50) NULL,
	[ac_email] [char](50) NULL,
	[ac_dadd1] [char](50) NULL,
	[ac_dadd2] [char](50) NULL,
	[ac_dplace] [char](50) NULL,
	[ac_dstate] [char](50) NULL,
	[ac_dpin] [char](6) NULL,
	[ac_dcont] [char](50) NULL,
	[ac_dpho] [char](50) NULL,
	[ac_dphr] [char](50) NULL,
	[ac_dphm] [char](50) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[distmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[distmst](
	[sno] [int] IDENTITY(1,1) NOT NULL,
	[dist_nm] [char](50) NULL,
	[state_cd] [int] NULL,
	[dist_pop] [money] NULL,
	[dist_area] [money] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[expmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[expmst](
	[sno] [int] IDENTITY(1,1) NOT NULL,
	[expnm] [char](50) NULL,
	[type] [char](2) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[groupmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS OFF
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[groupmst](
	[g_sno] [int] NOT NULL,
	[g_name] [char](50) NULL,
	[g_type] [char](25) NULL,
	[g_supprs] [char](1) NULL,
	[g_sgrp] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Item]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Item](
	[ITNo] [int] NULL,
	[ITName] [nvarchar](20) NULL,
	[CoCode] [int] NULL,
	[ExpPer] [float] NULL,
	[ITPKNo] [int] NULL,
	[ITAmTCal] [nvarchar](1) NULL,
	[SchRate] [float] NULL,
	[RWeight] [float] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[itemmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS OFF
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[itemmst](
	[sno] [int] IDENTITY(1,1) NOT NULL,
	[item_nm] [char](50) NULL,
	[item_grp] [char](50) NULL,
	[item_descr] [char](100) NULL,
	[item_unit] [char](10) NULL,
	[item_shtnm] [char](10) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[itemspec]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[itemspec](
	[sno] [int] IDENTITY(1,1) NOT NULL,
	[itm_sno] [int] NULL,
	[spec_nm] [char](50) NULL,
	[spec_val] [money] NULL,
	[spec_minmax] [char](5) NULL,
	[spec_rmk] [char](100) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[itemstp]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS OFF
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[itemstp](
	[sno] [int] IDENTITY(1,1) NOT NULL,
	[it_sno] [int] NULL,
	[it_pck] [money] NULL,
	[it_bk] [char](5) NULL,
	[it_ratesl] [money] NULL,
	[it_ratetypsl] [char](5) NULL,
	[it_ratebr] [money] NULL,
	[it_ratetypbr] [char](5) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[narrmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS OFF
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[narrmst](
	[sno] [int] IDENTITY(1,1) NOT NULL,
	[narration] [char](250) NULL,
	[type] [char](25) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ord_delv]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ord_delv](
	[sno] [int] IDENTITY(1,1) NOT NULL,
	[sr_no] [int] NULL,
	[yr] [char](10) NULL,
	[cocode] [int] NULL,
	[main_bk] [char](5) NULL,
	[c_j_s_p] [char](5) NULL,
	[vouc_code] [int] NULL,
	[vouc_chr] [char](1) NULL,
	[ord_sno] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[outsdet]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS OFF
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[outsdet](
	[sno] [int] IDENTITY(1,1) NOT NULL,
	[yr] [char](10) NULL,
	[cocode] [int] NULL,
	[main_bk] [char](5) NULL,
	[c_j_s_p] [char](5) NULL,
	[vouc_code] [int] NULL,
	[vouc_chr] [char](1) NULL,
	[sd_date] [datetime] NULL,
	[adj_yr] [char](10) NULL,
	[adj_cocode] [int] NULL,
	[adj_main_bk] [char](5) NULL,
	[adj_c_j_s_p] [char](5) NULL,
	[adj_vouc_code] [int] NULL,
	[adj_vouc_chr] [char](1) NULL,
	[exp_code] [int] NULL,
	[exp_rate] [money] NULL,
	[exp_amt] [money] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[outstanding]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS OFF
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[outstanding](
	[sno] [int] IDENTITY(1,1) NOT NULL,
	[yr] [char](10) NULL,
	[cocode] [int] NULL,
	[main_bk] [char](5) NULL,
	[c_j_s_p] [char](5) NULL,
	[vouc_code] [int] NULL,
	[vouc_chr] [char](1) NULL,
	[sd_date] [datetime] NULL,
	[adj_yr] [char](10) NULL,
	[adj_cocode] [int] NULL,
	[adj_main_bk] [char](5) NULL,
	[adj_c_j_s_p] [char](5) NULL,
	[adj_vouc_code] [int] NULL,
	[adj_vouc_chr] [char](1) NULL,
	[sl_code] [int] NULL,
	[sb_code] [int] NULL,
	[br_code] [int] NULL,
	[bb_code] [int] NULL,
	[pono] [char](50) NULL,
	[podt] [char](10) NULL,
	[term] [int] NULL,
	[paycond] [char](1) NULL,
	[paydiscrt] [money] NULL,
	[bill_amt] [money] NULL,
	[Outs_amt] [money] NULL,
	[Outs_rec] [money] NULL,
	[Outs_exp] [money] NULL,
	[Outs_clr] [money] NULL,
	[Outs_bal] [money] NULL,
	[rmks] [char](150) NULL,
	[cont_sno] [int] NULL,
	[due_date] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Party]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Party](
	[PRTNo] [int] NULL,
	[TINNO] [nvarchar](20) NULL,
	[Address] [nvarchar](250) NULL,
	[Phone] [nvarchar](20) NULL,
	[Station] [nvarchar](15) NULL,
	[PRName] [nvarchar](35) NULL,
	[Mobile1] [nvarchar](20) NULL,
	[Mobile2] [nvarchar](20) NULL,
	[PhoneO] [nvarchar](20) NULL,
	[PhoneO1] [nvarchar](20) NULL,
	[Fax] [nvarchar](25) NULL,
	[LSTNO] [nvarchar](20) NULL,
	[CSTNO] [nvarchar](20) NULL,
	[PTFullName] [nvarchar](65) NULL,
	[PhoneF] [nvarchar](20) NULL,
	[PCategory] [nvarchar](15) NULL,
	[MPRTNo] [int] NULL,
	[Mobile3] [nvarchar](20) NULL,
	[Mobile4] [nvarchar](20) NULL,
	[BrokApplyOn] [nvarchar](1) NULL,
	[Bank] [nvarchar](20) NOT NULL,
	[BankAcNo] [nvarchar](20) NOT NULL,
	[BankIFCICode] [nvarchar](10) NOT NULL,
	[ContPer] [nvarchar](20) NOT NULL,
	[ContPer1] [nvarchar](20) NOT NULL,
	[Email] [nvarchar](25) NOT NULL,
	[ContPer3] [nvarchar](20) NOT NULL,
	[ContPer4] [nvarchar](20) NOT NULL,
	[ac_place] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[payment]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[payment](
	[sno] [int] IDENTITY(1,1) NOT NULL,
	[yr] [char](10) NULL,
	[cocode] [int] NULL,
	[main_bk] [char](5) NULL,
	[c_j_s_p] [char](5) NULL,
	[vouc_code] [int] NULL,
	[vouc_chr] [char](1) NULL,
	[pay_date] [datetime] NULL,
	[sl_code] [int] NULL,
	[br_code] [int] NULL,
	[chkddtyp] [char](20) NULL,
	[chkddno] [char](40) NULL,
	[chkdddt] [datetime] NULL,
	[chkddamt] [money] NULL,
	[dep_bnk] [int] NULL,
	[dep_ac] [char](100) NULL,
	[courier] [int] NULL,
	[cou_rec] [char](25) NULL,
	[cou_chgs] [money] NULL,
	[rmks1] [char](150) NULL,
	[rmks2] [char](150) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[propmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[propmst](
	[sno] [int] IDENTITY(1,1) NOT NULL,
	[ac_name] [char](50) NULL,
	[ac_add1] [char](50) NULL,
	[ac_add2] [char](50) NULL,
	[ac_place] [int] NULL,
	[ac_pin] [char](6) NULL,
	[ac_cont] [char](50) NULL,
	[ac_pho] [char](50) NULL,
	[ac_phr] [char](50) NULL,
	[ac_phm] [char](50) NULL,
	[ac_tin] [char](50) NULL,
	[ac_pan] [char](50) NULL,
	[ac_email] [char](50) NULL,
	[ac_dadd1] [char](50) NULL,
	[ac_dadd2] [char](50) NULL,
	[ac_dplace] [char](50) NULL,
	[ac_dstate] [char](50) NULL,
	[ac_dpin] [char](6) NULL,
	[ac_dcont] [char](50) NULL,
	[ac_dpho] [char](50) NULL,
	[ac_dphr] [char](50) NULL,
	[ac_dphm] [char](50) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[prtitemstp]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS OFF
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[prtitemstp](
	[sno] [int] IDENTITY(1,1) NOT NULL,
	[prt_sno] [int] NULL,
	[it_sno] [int] NULL,
	[it_pck] [money] NULL,
	[it_bk] [char](5) NULL,
	[it_ratesl] [money] NULL,
	[it_ratetypsl] [char](5) NULL,
	[it_ratebr] [money] NULL,
	[it_ratetypbr] [char](5) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[sauda1]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[sauda1](
	[sno] [int] IDENTITY(1,1) NOT NULL,
	[yr] [char](10) NULL,
	[cocode] [int] NULL,
	[main_bk] [char](5) NULL,
	[c_j_s_p] [char](5) NULL,
	[vouc_code] [int] NULL,
	[vouc_chr] [char](1) NULL,
	[sd_date] [datetime] NULL,
	[sl_code] [int] NULL,
	[sb_code] [int] NULL,
	[br_code] [int] NULL,
	[bb_code] [int] NULL,
	[sl_cont] [char](50) NULL,
	[sb_cont] [char](50) NULL,
	[br_cont] [char](250) NULL,
	[bb_cont] [char](50) NULL,
	[sl_brok] [char](1) NULL,
	[sb_brok] [char](1) NULL,
	[br_brok] [char](1) NULL,
	[bb_brok] [char](1) NULL,
	[brok_yn] [char](1) NULL,
	[pono] [char](50) NULL,
	[podt] [char](10) NULL,
	[delv_fr] [char](10) NULL,
	[delv_to] [char](10) NULL,
	[delvdet] [char](50) NULL,
	[term] [int] NULL,
	[from_ct] [int] NULL,
	[to_ct] [int] NULL,
	[paycond] [char](1) NULL,
	[paydiscrt] [money] NULL,
	[paydet] [char](250) NULL,
	[cform] [char](1) NULL,
	[rmks] [char](150) NULL,
	[mod] [char](1) NULL,
	[modrmks] [char](100) NULL,
	[bill_amt] [money] NULL,
	[mot_no] [char](35) NULL,
	[frght] [money] NULL,
	[frght_rt] [money] NULL,
	[frght_adv] [money] NULL,
	[add1_rmk] [char](35) NULL,
	[add1_amt] [money] NULL,
	[add2_rmk] [char](35) NULL,
	[add2_amt] [money] NULL,
	[add3_rmk] [char](35) NULL,
	[add3_amt] [money] NULL,
	[less1_rmk] [char](35) NULL,
	[less1_amt] [money] NULL,
	[less2_rmk] [char](35) NULL,
	[less2_amt] [money] NULL,
	[less3_rmk] [char](35) NULL,
	[less3_amt] [money] NULL,
	[barg_amt] [money] NULL,
	[specdet] [char](150) NULL,
	[bankdet] [char](250) NULL,
	[arbit] [char](250) NULL,
	[cur_rt] [money] NULL,
	[cur_sym] [char](10) NULL,
	[tptcode] [int] NULL,
	[shipmark] [char](200) NULL,
	[slr_bnkdet] [char](250) NULL,
	[wght_term] [char](100) NULL,
	[price_term] [char](50) NULL,
	[insp_det] [char](100) NULL,
	[ship_det] [char](50) NULL,
	[bno] [char](50) NULL,
	[bdt] [char](10) NULL,
	[tpt_col] [money] NULL,
	[delv_load] [char](25) NULL,
	[origin] [char](50) NULL,
	[apprxwght] [char](50) NULL,
	[discrt] [money] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[sauda2]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[sauda2](
	[sno] [int] IDENTITY(1,1) NOT NULL,
	[cont_sno] [int] NULL,
	[cont2_sno] [int] NULL,
	[sr_no] [int] NULL,
	[yr] [char](10) NULL,
	[cocode] [int] NULL,
	[main_bk] [char](5) NULL,
	[c_j_s_p] [char](5) NULL,
	[vouc_code] [int] NULL,
	[vouc_chr] [char](1) NULL,
	[typ] [char](2) NULL,
	[sddate] [datetime] NULL,
	[p_code] [int] NULL,
	[op_code] [int] NULL,
	[it_code] [int] NULL,
	[brnd_code] [int] NULL,
	[bag] [money] NULL,
	[pck] [money] NULL,
	[ipck] [char](25) NULL,
	[wght] [money] NULL,
	[qty_exe] [money] NULL,
	[qty_rem] [money] NULL,
	[qty_bal] [money] NULL,
	[g_n] [char](1) NULL,
	[k_rate] [money] NULL,
	[b_rate] [money] NULL,
	[w_q] [char](1) NULL,
	[amount] [money] NULL,
	[slbrk_rt] [money] NULL,
	[slbrk_typ] [char](5) NULL,
	[slbrk_amt] [money] NULL,
	[brbrk_rt] [money] NULL,
	[brbrk_typ] [char](5) NULL,
	[brbrk_amt] [money] NULL,
	[blyr] [char](10) NULL,
	[blcocode] [int] NULL,
	[blmain_bk] [char](5) NULL,
	[blc_j_s_p] [char](5) NULL,
	[blvouc_code] [int] NULL,
	[blvouc_chr] [char](1) NULL,
	[bldate] [datetime] NULL,
	[blfromdate] [datetime] NULL,
	[bltodate] [datetime] NULL,
	[qltydet] [char](50) NULL,
	[pckunit] [char](10) NULL,
	[pcktype] [char](5) NULL,
	[pckdet] [char](50) NULL,
	[wghtunit] [char](5) NULL,
	[rateper] [money] NULL,
	[brk_rt] [money] NULL,
	[brk_typ] [char](5) NULL,
	[brk_amt] [money] NULL,
	[genebillyn] [char](1) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[saudadocu]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS OFF
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[saudadocu](
	[sno] [int] IDENTITY(1,1) NOT NULL,
	[yr] [char](10) NULL,
	[cocode] [int] NULL,
	[main_bk] [char](5) NULL,
	[c_j_s_p] [char](5) NULL,
	[vouc_code] [int] NULL,
	[vouc_chr] [char](1) NULL,
	[narration] [char](250) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[saudaspec]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS OFF
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[saudaspec](
	[sno] [int] IDENTITY(1,1) NOT NULL,
	[yr] [char](10) NULL,
	[cocode] [int] NULL,
	[main_bk] [char](5) NULL,
	[c_j_s_p] [char](5) NULL,
	[vouc_code] [int] NULL,
	[vouc_chr] [char](1) NULL,
	[spec_nm] [char](50) NULL,
	[spec_val] [money] NULL,
	[spec_minmax] [char](5) NULL,
	[spec_rmk] [char](100) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[saudatrms]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS OFF
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[saudatrms](
	[sno] [int] IDENTITY(1,1) NOT NULL,
	[yr] [char](10) NULL,
	[cocode] [int] NULL,
	[main_bk] [char](5) NULL,
	[c_j_s_p] [char](5) NULL,
	[vouc_code] [int] NULL,
	[vouc_chr] [char](1) NULL,
	[narration] [char](250) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[statemst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[statemst](
	[sno] [int] IDENTITY(1,1) NOT NULL,
	[state_nm] [char](50) NULL,
	[state_area] [money] NULL,
	[state_cap] [char](50) NULL,
	[active] [nchar](1) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Station]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Station](
	[Station] [nvarchar](15) NULL,
	[District] [nvarchar](15) NULL,
	[Route] [nvarchar](15) NULL,
	[STDNo] [nvarchar](7) NULL,
	[stncd] [int] NULL,
	[dstcd] [int] NULL,
	[statecd] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[stationmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[stationmst](
	[sno] [int] IDENTITY(1,1) NOT NULL,
	[st_name] [char](50) NULL,
	[st_state] [int] NULL,
	[st_district] [int] NULL,
	[st_stdcd] [char](20) NULL,
	[st_pincode] [char](6) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[termmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[termmst](
	[sno] [int] IDENTITY(1,1) NOT NULL,
	[term] [char](250) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[trptmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[trptmst](
	[sno] [int] IDENTITY(1,1) NOT NULL,
	[tr_name] [char](50) NULL,
	[tr_add1] [char](50) NULL,
	[tr_add2] [char](50) NULL,
	[tr_place] [int] NULL,
	[tr_pin] [char](6) NULL,
	[tr_cont] [char](50) NULL,
	[tr_pho] [char](50) NULL,
	[tr_phr] [char](50) NULL,
	[tr_phm] [char](50) NULL,
	[tr_pan] [char](50) NULL,
	[tr_email] [char](50) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[vehmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[vehmst](
	[sno] [int] IDENTITY(1,1) NOT NULL,
	[veh_name] [char](40) NULL,
	[veh_wght] [money] NULL,
	[veh_apprxwght] [char](50) NULL,
	[veh_minapprx] [money] NULL,
	[veh_maxapprx] [money] NULL
) ON [PRIMARY]
GO
/****** Object:  Index [idx_sno]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_sno] ON [dbo].[accountmst]
(
	[sno] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [idx_sno]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_sno] ON [dbo].[brandmst]
(
	[sno] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [idx_sno]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_sno] ON [dbo].[distmst]
(
	[sno] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [idx_sno]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_sno] ON [dbo].[itemmst]
(
	[sno] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [idx_bbbrok]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_bbbrok] ON [dbo].[sauda1]
(
	[bb_brok] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [idx_bbcode]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_bbcode] ON [dbo].[sauda1]
(
	[bb_code] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [idx_brbrok]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_brbrok] ON [dbo].[sauda1]
(
	[br_brok] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [idx_brcode]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_brcode] ON [dbo].[sauda1]
(
	[br_code] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [idx_brokyn]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_brokyn] ON [dbo].[sauda1]
(
	[brok_yn] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [idx_sbbrok]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_sbbrok] ON [dbo].[sauda1]
(
	[sb_brok] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [idx_sbcode]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_sbcode] ON [dbo].[sauda1]
(
	[sb_code] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [idx_slbrok]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_slbrok] ON [dbo].[sauda1]
(
	[sl_brok] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [idx_slcode]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_slcode] ON [dbo].[sauda1]
(
	[sl_code] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [idx_sno]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_sno] ON [dbo].[sauda1]
(
	[sno] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [idx_vcd]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_vcd] ON [dbo].[sauda1]
(
	[cocode] ASC,
	[yr] ASC,
	[main_bk] ASC,
	[c_j_s_p] ASC,
	[vouc_code] ASC,
	[vouc_chr] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [idx_bldate]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_bldate] ON [dbo].[sauda2]
(
	[bldate] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [idx_blfromdate]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_blfromdate] ON [dbo].[sauda2]
(
	[blfromdate] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [idx_bltodate]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_bltodate] ON [dbo].[sauda2]
(
	[bltodate] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [idx_blvcd]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_blvcd] ON [dbo].[sauda2]
(
	[blcocode] ASC,
	[blyr] ASC,
	[blmain_bk] ASC,
	[blc_j_s_p] ASC,
	[blvouc_code] ASC,
	[blvouc_chr] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [idx_brndcode]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_brndcode] ON [dbo].[sauda2]
(
	[brnd_code] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [idx_cont2sno]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_cont2sno] ON [dbo].[sauda2]
(
	[cont2_sno] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [idx_contsno]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_contsno] ON [dbo].[sauda2]
(
	[cont_sno] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [idx_genebillyn]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_genebillyn] ON [dbo].[sauda2]
(
	[genebillyn] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [idx_itcode]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_itcode] ON [dbo].[sauda2]
(
	[it_code] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [idx_pcode]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_pcode] ON [dbo].[sauda2]
(
	[p_code] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [idx_sno]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_sno] ON [dbo].[sauda2]
(
	[sno] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [idx_typ]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_typ] ON [dbo].[sauda2]
(
	[typ] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [idx_vcd]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_vcd] ON [dbo].[sauda2]
(
	[cocode] ASC,
	[yr] ASC,
	[main_bk] ASC,
	[c_j_s_p] ASC,
	[vouc_code] ASC,
	[vouc_chr] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [idx_vcd1]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_vcd1] ON [dbo].[sauda2]
(
	[cocode] ASC,
	[yr] ASC,
	[main_bk] ASC,
	[c_j_s_p] ASC,
	[vouc_code] ASC,
	[vouc_chr] ASC,
	[sr_no] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [idx_vcd2]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_vcd2] ON [dbo].[sauda2]
(
	[cocode] ASC,
	[yr] ASC,
	[main_bk] ASC,
	[c_j_s_p] ASC,
	[vouc_code] ASC,
	[vouc_chr] ASC,
	[sr_no] ASC,
	[typ] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [idx_sno]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_sno] ON [dbo].[saudaspec]
(
	[sno] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [idx_sno]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_sno] ON [dbo].[saudatrms]
(
	[sno] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [idx_sno]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_sno] ON [dbo].[statemst]
(
	[sno] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [idx_sno]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_sno] ON [dbo].[stationmst]
(
	[sno] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [idx_sno]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_sno] ON [dbo].[termmst]
(
	[sno] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [idx_sno]    Script Date: 13/08/2026 06:48:28 ******/
CREATE NONCLUSTERED INDEX [idx_sno] ON [dbo].[trptmst]
(
	[sno] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  StoredProcedure [dbo].[accountddet]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [dbo].[accountddet] 	
	(@acsno int,@inchnm varchar(50),@add1 varchar(50),@add2 varchar(50),@city int,@phoneno varchar(50),@mobno varchar(50))
AS	 
	declare @sno int
	Select @sno = sno from account_det where ac_sno = @acsno and city = @city
	if @sno >0
	Begin
		update account_det set inch_nm = @inchnm ,add_1 = @add1,add_2 = @add2,phoneno = @phoneno,mobno=@mobno where ac_sno = @acsno and city = @city
	End
	else 
	Begin	
		insert into account_det(ac_sno,inch_nm,add_1,add_2,city,phoneno,mobno) values 
			(@acsno,@inchnm,@add1,@add2,@city,@phoneno,@mobno) 
	end
	
 SET NOCOUNT ON 
	RETURN 
GO
/****** Object:  StoredProcedure [dbo].[AddAcmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [dbo].[AddAcmst] 	
	(@mnbk varchar(2),@acname varchar(50),@acadd1 varchar(50),@acadd2 varchar(50),@acplace INT,@acpin varchar(6),@acsie varchar(1),@accont varchar(50),@acpho varchar(50),@acphr varchar(50),@acphm varchar(50),@actin varchar(50),@acpan varchar(50),@gsno int,@chrcode varchar(5),@opbal money,@opbaldc varchar(2),@opdt datetime,@billprty int,@acemail varchar(50),@db1nm varchar(50)) 
	
AS	 
	declare @sql varchar(250)	
	
	declare @accode int
	insert into accountmst (ac_name,ac_add1,ac_add2,ac_place,ac_pin,ac_sie,ac_cont,ac_pho,ac_phr,ac_phm,ac_tin,ac_pan,g_sno,chr_code,bill_prty,ac_email) values (@acname,@acadd1,@acadd2,@acplace,@acpin,@acsie,@accont,@acpho,@acphr,@acphm,@actin,@acpan,@gsno,@chrcode,@billprty,@acemail) 
	select @accode = max(sno) from accountmst
	if @opbal <> 0 
	begin
		select @sql =  'insert into ' + @db1nm  + '.dbo.trans (main_bk,c_j_s_p,pcd,d_a_t_e,amount,d_c) values (''' +  @mnbk + ''',''' + @mnbk + ''',' + str(@accode) + ',''' +  convert(varchar(20), @opdt) + ''',' + str(@opbal) + ',''' + @opbaldc + ''')' 
		EXEC (@sql) 
	end
 SET NOCOUNT ON 
	RETURN

set ANSI_NULLS ON
set QUOTED_IDENTIFIER ON

GO
/****** Object:  StoredProcedure [dbo].[AddBankmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS OFF
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[AddBankmst] 	
	(@bnkname varchar(100),@bnkbrnch varchar(50),@bnkifsc varchar(25),@bnkmicr varchar(50),@bnkadd varchar(200),@bnkadd1 varchar(100),@bnkcenter varchar(200),@bnkcont varchar(200),@bnkdist varchar(50),@stcode int) 
	
AS	 
	INSERT INTO bankmst
                      (bnk_name, bnk_brnch, bnk_ifsc, bnk_micr, bnk_add,bnk_add1, bnk_center, bnk_cont, bnk_dist, bnk_state)
		 values (@bnkname,@bnkbrnch ,@bnkifsc ,@bnkmicr ,@bnkadd ,@bnkadd1,@bnkcenter,@bnkcont ,@bnkdist ,@stcode ) 

 SET NOCOUNT ON 
	RETURN

GO
/****** Object:  StoredProcedure [dbo].[AddBrandmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


CREATE PROCEDURE [dbo].[AddBrandmst]
	(
	@brndsno int,@brandstpsno int,@descri varchar(50),@brregyn varchar(1),@brregno varchar(35),@brpack money,@bripack varchar(35))
AS	 
	declare @ssno int
	Select @ssno =0
	Select @ssno = sno from brandmst where sno=@brndsno
	if  @ssno=0 
	     Begin 
		Select @ssno = sno from brandmst where brand_name=@descri
		if  @ssno=0 
	  	    Begin
		        insert into brandmst (brand_name,brand_regyn,brand_regno) values (@descri,@brregyn,@brregno) 
		        Select @ssno = sno from brandmst where brand_name=@descri
		    end
                     end
                else
                    Begin 
		update brandmst set brand_name=@descri ,brand_regno=@brregno,brand_regyn=@brregyn where sno =@brndsno
		Select @ssno =@brndsno
                     end                   
	if @brandstpsno=0 
	   BEGIN
		if @brpack>0
		 begin
			insert into brandstp (br_sno,br_pack,br_ipack) values (@ssno,@brpack,@bripack) 
		 end
	   END
	else 
	     BEGIN	
		update brandstp set br_sno = @ssno,br_pack=@brpack,br_ipack=@bripack where sno =@brandstpsno
	     END	
		
	 SET NOCOUNT ON 
	RETURN


GO
/****** Object:  StoredProcedure [dbo].[Addcoumst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


CREATE PROCEDURE [dbo].[Addcoumst] 	
	(
	@acname varchar(50),@acadd1 varchar(50),@acadd2 varchar(50),@acplace int,@acpin varchar(6),@accont varchar(50),@acpho varchar(50),@acphr varchar(50),@acphm varchar(50),@actin varchar(50),@acpan varchar(50),@acemail varchar(50)) 
	
AS	 
	insert into coumst (ac_name,ac_add1,ac_add2,ac_place,ac_pin,ac_cont,ac_pho,ac_phr,ac_phm,ac_tin,ac_pan,ac_email) values (@acname,@acadd1,@acadd2,@acplace,@acpin,@accont,@acpho,@acphr,@acphm,@actin,@acpan,@acemail) 
 SET NOCOUNT ON 
	RETURN


GO
/****** Object:  StoredProcedure [dbo].[AddDDelivery]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


create PROCEDURE [dbo].[AddDDelivery]
	(@yr varchar(10),@cocode int, @mnbk varchar(5),@cjsp varchar(5),@vouccode int,@voucchr varchar(1),@sddate datetime,
	@slcode int,@sbcode int,@brcode int,@bbcode int,@slcont varchar(50),@sbcont varchar(50),@brcont varchar(50),@bbcont varchar(50),
	@slbrok varchar(1),@sbbrok varchar(1),@brbrok varchar(1),@bbbrok varchar(1),@brok varchar(1), @pono varchar(50),@podate varchar(50), @bno varchar(50),@bdate varchar(50),
	@delvfr varchar(50),@delvto varchar(50),@term int,@fromct int , @toct int,@paycond varchar(1),@disccrdrt money,@form varchar(1),@rmks varchar(150),
	@itcode int,@brndcode int,@bag money,@pck money,@ipck varchar(25),@wght money,@qtyexe money,@qtybal money,@qtyrem money,@gn varchar(1),@krate money,@brate money,@wq varchar(1),
	@amt money,@slbrkrt money, @slbrktyp varchar(5),@slbrkamt money,@brbrkrt money, @brbrktyp varchar(5),@brbrkamt money,@srno int,@cont2sno int,
	@billamt money,@motno varchar(35),@frght money,@frghtrt money,@frghtadv money,@add1rmk varchar(35),@add1amt money,@add2rmk varchar(35),@add2amt money,@add3rmk varchar(35),@add3amt money,
	@less1rmk varchar(35),@less1amt money,@less2rmk varchar(35),@less2amt money,@less3rmk varchar(35),@less3amt money,@bargamt money,@tptcode int)	
AS	 
	declare @vvcd int
	select @vvcd = @vouccode
	declare @vcd int
	select @vcd = 0
	declare @c2sno int
	declare @c2yr varchar(10)
	declare @c2cocode int
	declare @c2mnbk varchar(5)
	declare @c2cjsp varchar(5)
	declare @c2vouccode int
	declare @c2srno int
	declare @c2voucchr varchar(1)

	select @c2yr = yr from sauda2 where sno = @cont2sno
	select @c2cocode = cocode from sauda2 where sno = @cont2sno
	select @c2mnbk = main_bk from sauda2 where sno = @cont2sno
	select @c2cjsp =c_j_s_p from sauda2 where sno = @cont2sno
	select @c2vouccode = vouc_code from sauda2 where sno = @cont2sno
	select @c2srno = sr_no from sauda2 where sno = @cont2sno
	select @c2voucchr = vouc_chr from sauda2 where sno = @cont2sno
/*    UPDATE    sauda2 SET sauda2.qty_exe = 0, sauda2.qty_bal = sauda2.bag*/
	select @c2sno = 0
	select @vcd = sno from sauda1 where yr =  @yr and cocode = @cocode and main_bk = @mnbk AND c_j_s_p = @cjsp and   vouc_code =  @vvcd and vouc_chr = @voucchr
	declare @sdsno int	
	declare @summ money,@qtyremtot money
	declare @duedt datetime    
	select @sdsno = 0		

	select @vcd = sno from sauda1 where yr =  @yr and cocode = @cocode and main_bk = @mnbk AND c_j_s_p = @cjsp and   vouc_code =  @vvcd and vouc_chr = @voucchr
	select @c2sno = sno from sauda2 where yr =  @c2yr and cocode = @c2cocode and main_bk = @c2mnbk AND c_j_s_p = @c2cjsp and   vouc_code =  @c2vouccode and vouc_chr = @c2voucchr and sr_no = @c2srno and typ = 'SL'

	if @vcd = 0
	BEGIN
		insert into sauda1(yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,sd_date,sl_code,sb_code,br_code,bb_code,sl_cont,sb_cont,br_cont,bb_cont,sl_brok,sb_brok,br_brok,bb_brok,brok_yn,pono,podt,delv_fr,delv_to,term,from_ct,to_ct,paycond,paydiscrt,cform,bill_amt,mot_no,frght,frght_rt,frght_adv,add1_rmk,add1_amt,add2_rmk,add2_amt,add3_rmk,add3_amt,less1_rmk,less1_amt,less2_rmk,less2_amt,less3_rmk,less3_amt,barg_amt,rmks,tptcode,bno,bdt) 
		values (@yr,@cocode,@mnbk,@cjsp,@vvcd,@voucchr,@sddate,@slcode,@sbcode,@brcode,@bbcode,@slcont,@sbcont,@brcont,@bbcont,@slbrok,@sbbrok,@brbrok,@bbbrok,@brok,@pono,@podate,@delvfr,@delvto,@term,@fromct,@toct,@paycond,@disccrdrt,@form,@billamt,@motno,@frght,@frghtrt,@frghtadv,@add1rmk,@add1amt,@add2rmk,@add2amt,@add3rmk,@add3amt,@less1rmk,@less1amt,@less2rmk,@less2amt,@less3rmk,@less3amt,@bargamt,@rmks,@tptcode,@bno,@bdate)		
		
		select @duedt = dateadd(d,@disccrdrt,@sddate) where @paycond = 'C'
		select @duedt = @sddate where  @paycond = 'D'

		insert into outstanding(yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,sd_date,adj_yr,adj_cocode,adj_main_bk,adj_c_j_s_p,adj_vouc_code,adj_vouc_chr,sl_code,sb_code,br_code,bb_code,pono,podt,term,paycond,paydiscrt,bill_amt,Outs_amt,Outs_rec,Outs_exp,Outs_clr,Outs_bal,cont_sno,due_date) 
		values (@yr,@cocode,@mnbk,@cjsp,@vvcd,@voucchr,@sddate,@yr,@cocode,@mnbk,@cjsp,@vvcd,@voucchr,@slcode,@sbcode,@brcode,@bbcode,@bno,@bdate,@term,@paycond,@disccrdrt,@billamt,@bargamt,0,0,0,@bargamt,@c2sno,@duedt)
	END 

	select @vcd = sno from sauda1 where yr =  @yr and cocode = @cocode and main_bk = @mnbk AND c_j_s_p = @cjsp and   vouc_code =  @vvcd and vouc_chr = @voucchr
	
	insert into sauda2(cont_sno,cont2_sno,yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,sddate,p_code,typ,it_code,brnd_code,bag,pck,ipck,wght,qty_exe,qty_rem,qty_bal,g_n,k_rate,b_rate,w_q,amount,slbrk_rt,slbrk_typ,slbrk_amt,brbrk_rt,brbrk_typ,brbrk_amt,sr_no) 
	values                   (@vcd,@c2sno ,@yr,@cocode,@mnbk,@cjsp,@vvcd,@voucchr,@sddate,@slcode,'SL',@itcode,@brndcode,@bag,@pck,@ipck,@wght,@qtyexe,@qtyrem,@qtybal,@gn,@krate,@brate,@wq,@amt,@slbrkrt,@slbrktyp,@slbrkamt,@brbrkrt,@brbrktyp,@brbrkamt,@srno)	

	insert into sauda2(cont_sno,cont2_sno,yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,sddate,p_code,typ,it_code,brnd_code,bag,pck,ipck,wght,qty_exe,qty_rem,qty_bal,g_n,k_rate,b_rate,w_q,amount,slbrk_rt,slbrk_typ,slbrk_amt,brbrk_rt,brbrk_typ,brbrk_amt,sr_no) 
	values                   (@vcd,@c2sno ,@yr,@cocode,@mnbk,@cjsp,@vvcd,@voucchr,@sddate,@brcode,'BR',@itcode,@brndcode,@bag,@pck,@ipck,@wght,@qtyexe,@qtyrem,@qtybal,@gn,@krate,@brate,@wq,@amt,@slbrkrt,@slbrktyp,@slbrkamt,@brbrkrt,@brbrktyp,@brbrkamt,@srno)	



	 SET NOCOUNT ON 
	RETURN



---------------------------

set ANSI_NULLS ON
set QUOTED_IDENTIFIER ON




set ANSI_NULLS ON
set QUOTED_IDENTIFIER ON




GO
/****** Object:  StoredProcedure [dbo].[AddDelivery]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


CREATE PROCEDURE [dbo].[AddDelivery]
	(@yr varchar(10),@cocode int, @mnbk varchar(5),@cjsp varchar(5),@vouccode int,@voucchr varchar(1),@sddate datetime,@bltype varchar(1),
	@slcode int,@sbcode int,@brcode int,@bbcode int,@slcont varchar(50),@sbcont varchar(50),@brcont varchar(50),@bbcont varchar(50),
	@slbrok varchar(1),@sbbrok varchar(1),@brbrok varchar(1),@bbbrok varchar(1),@brok varchar(1), @pono varchar(50),@podate varchar(50),
	@delvfr varchar(50),@delvto varchar(50),@term int,@fromct int , @toct int,@paycond varchar(1),@disccrdrt money,@form varchar(1),@rmks varchar(150),
	@itcode int,@brndcode int,@bag money,@pck money,@ipck varchar(25),@wght money,@qtyexe money,@qtybal money,@qtyrem money,@gn varchar(1),@krate money,@brate money,@wq varchar(1),
	@amt money,@slbrkrt money, @slbrktyp varchar(5),@slbrkamt money,@brbrkrt money, @brbrktyp varchar(5),@brbrkamt money,@srno int,@cont2sno int,
	@billamt money,@motno varchar(35),@frght money,@frghtrt money,@frghtadv money,@add1rmk varchar(35),@add1amt money,@add2rmk varchar(35),@add2amt money,@add3rmk varchar(35),@add3amt money,
	@less1rmk varchar(35),@less1amt money,@less2rmk varchar(35),@less2amt money,@less3rmk varchar(35),@less3amt money,@bargamt money,@tptcode int,@tptcol money,@rateper money)	
AS	 
	declare @vvcd int
	select @vvcd = @vouccode
	declare @vcd int
	select @vcd = 0
	declare @c2sno int
	declare @c2yr varchar(10)
	declare @c2cocode int
	declare @c2mnbk varchar(5)
	declare @c2cjsp varchar(5)
	declare @c2vouccode int
	declare @c2srno int
	declare @c2voucchr varchar(1)

	select @c2yr = yr from sauda2 where sno = @cont2sno
	select @c2cocode = cocode from sauda2 where sno = @cont2sno
	select @c2mnbk = main_bk from sauda2 where sno = @cont2sno
	select @c2cjsp =c_j_s_p from sauda2 where sno = @cont2sno
	select @c2vouccode = vouc_code from sauda2 where sno = @cont2sno
	select @c2srno = sr_no from sauda2 where sno = @cont2sno
	select @c2voucchr = vouc_chr from sauda2 where sno = @cont2sno
/*    UPDATE    sauda2 SET sauda2.qty_exe = 0, sauda2.qty_bal = sauda2.bag*/
	select @c2sno = 0
	select @vcd = sno from sauda1 where yr =  @yr and cocode = @cocode and main_bk = @mnbk AND c_j_s_p = @cjsp and   vouc_code =  @vvcd and vouc_chr = @voucchr
	declare @sdsno int	
	declare @summ money,@qtyremtot money
	declare @duedt datetime    
	select @sdsno = 0		

	select @vcd = sno from sauda1 where yr =  @yr and cocode = @cocode and main_bk = @mnbk AND c_j_s_p = @cjsp and   vouc_code =  @vvcd and vouc_chr = @voucchr
	
	if @vcd = 0
	BEGIN
		insert into sauda1(yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,sd_date,sl_code,sb_code,br_code,bb_code,sl_cont,sb_cont,br_cont,bb_cont,sl_brok,sb_brok,br_brok,bb_brok,brok_yn,pono,podt,delv_fr,delv_to,term,from_ct,to_ct,paycond,paydiscrt,cform,bill_amt,mot_no,frght,frght_rt,frght_adv,add1_rmk,add1_amt,add2_rmk,add2_amt,add3_rmk,add3_amt,less1_rmk,less1_amt,less2_rmk,less2_amt,less3_rmk,less3_amt,barg_amt,rmks,tptcode,tpt_col) 
		values (@yr,@cocode,@mnbk,@cjsp,@vvcd,@voucchr,@sddate,@slcode,@sbcode,@brcode,@bbcode,@slcont,@sbcont,@brcont,@bbcont,@slbrok,@sbbrok,@brbrok,@bbbrok,@brok,@pono,@podate,@delvfr,@delvto,@term,@fromct,@toct,@paycond,@disccrdrt,@form,@billamt,@motno,@frght,@frghtrt,@frghtadv,@add1rmk,@add1amt,@add2rmk,@add2amt,@add3rmk,@add3amt,@less1rmk,@less1amt,@less2rmk,@less2amt,@less3rmk,@less3amt,@bargamt,@rmks,@tptcode,@tptcol)		
		
		select @duedt = dateadd(d,@disccrdrt,@sddate) where @paycond = 'C'
		select @duedt = @sddate where  @paycond = 'D'

		insert into outstanding(yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,sd_date,adj_yr,adj_cocode,adj_main_bk,adj_c_j_s_p,adj_vouc_code,adj_vouc_chr,sl_code,sb_code,br_code,bb_code,pono,podt,term,paycond,paydiscrt,bill_amt,Outs_amt,Outs_rec,Outs_exp,Outs_clr,Outs_bal,cont_sno,due_date) 
		values (@yr,@cocode,@mnbk,@cjsp,@vvcd,@voucchr,@sddate,@yr,@cocode,@mnbk,@cjsp,@vvcd,@voucchr,@slcode,@sbcode,@brcode,@bbcode,@pono,@podate,@term,@paycond,@disccrdrt,@billamt,@bargamt,0,0,0,@bargamt,@c2sno,@duedt)
	END 

	select @vcd = sno from sauda1 where yr =  @yr and cocode = @cocode and main_bk = @mnbk AND c_j_s_p = @cjsp and   vouc_code =  @vvcd and vouc_chr = @voucchr

	select @c2sno = sno from sauda2 where yr =  @c2yr and cocode = @c2cocode and main_bk = @c2mnbk AND c_j_s_p = @c2cjsp and   vouc_code =  @c2vouccode and vouc_chr = @c2voucchr and sr_no = @c2srno and typ = 'SL'

	insert into sauda2(cont_sno,cont2_sno,yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,sddate,p_code,typ,it_code,brnd_code,bag,pck,qltydet,wght,qty_exe,qty_rem,qty_bal,g_n,k_rate,b_rate,w_q,amount,slbrk_rt,slbrk_typ,slbrk_amt,brbrk_rt,brbrk_typ,brbrk_amt,sr_no,rateper) 
	values                   (@vcd,@c2sno ,@yr,@cocode,@mnbk,@cjsp,@vvcd,@voucchr,@sddate,@slcode,'SL',@itcode,@brndcode,@bag,@pck,@ipck,@wght,@qtyexe,@qtyrem,@qtybal,@gn,@krate,@brate,@wq,@amt,@slbrkrt,@slbrktyp,@slbrkamt,@brbrkrt,@brbrktyp,@brbrkamt,@srno,@rateper)	
	select @summ = 0,@qtyremtot =0

	if @bltype = 'W' 
		Begin
			select @summ = sum(sauda2.wght),@qtyremtot =sum(sauda2.qty_rem) from  sauda2 where sauda2.cont2_sno = @c2sno group by sauda2.cont2_sno		
			UPDATE sauda2 SET sauda2.qty_exe = @summ,sauda2.qty_rem = @qtyremtot ,sauda2.qty_bal = sauda2.wght -@summ-@qtyremtot fROM sauda2 where sauda2.sno = @c2sno and main_bk = 'SD'
		end
	else
		if @bltype = 'V' 
			Begin
				select @summ = sum(sauda2.rateper),@qtyremtot =sum(sauda2.qty_rem) from  sauda2 where sauda2.cont2_sno = @c2sno group by sauda2.cont2_sno		
				UPDATE sauda2 SET sauda2.qty_exe = @summ,sauda2.qty_rem = @qtyremtot ,sauda2.qty_bal = sauda2.rateper -@summ-@qtyremtot fROM sauda2 where sauda2.sno = @c2sno and main_bk = 'SD'
			end
		else
			Begin
				select @summ = sum(sauda2.bag),@qtyremtot =sum(sauda2.qty_rem)  from  sauda2 where sauda2.cont2_sno = @c2sno group by sauda2.cont2_sno	
				UPDATE sauda2 SET sauda2.qty_exe = @summ,sauda2.qty_rem = @qtyremtot ,sauda2.qty_bal = sauda2.bag -@summ-@qtyremtot fROM sauda2 where sauda2.sno = @c2sno and main_bk = 'SD'
			end
	
	
	select @c2sno = sno from sauda2 where yr =  @c2yr and cocode = @c2cocode and main_bk = @c2mnbk AND c_j_s_p = @c2cjsp and   vouc_code =  @c2vouccode and vouc_chr = @c2voucchr and sr_no = @c2srno and typ = 'SB'
	insert into sauda2(cont_sno,cont2_sno,yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,sddate,p_code,typ,it_code,brnd_code,bag,pck,qltydet,wght,qty_exe,qty_rem,qty_bal,g_n,k_rate,b_rate,w_q,amount,slbrk_rt,slbrk_typ,slbrk_amt,brbrk_rt,brbrk_typ,brbrk_amt,sr_no,rateper) 
	values                   (@vcd,@c2sno ,@yr,@cocode,@mnbk,@cjsp,@vvcd,@voucchr,@sddate,@sbcode,'SB',@itcode,@brndcode,@bag,@pck,@ipck,@wght,@qtyexe,@qtyrem,@qtybal,@gn,@krate,@brate,@wq,@amt,@slbrkrt,@slbrktyp,@slbrkamt,@brbrkrt,@brbrktyp,@brbrkamt,@srno,@rateper)	
	select @summ = 0,@qtyremtot =0
	if @bltype = 'W' 
	Begin
		select @summ = sum(sauda2.wght),@qtyremtot =sum(sauda2.qty_rem) from  sauda2 where sauda2.cont2_sno = @c2sno group by sauda2.cont2_sno		
		UPDATE sauda2 SET sauda2.qty_exe = @summ,sauda2.qty_rem = @qtyremtot ,sauda2.qty_bal = sauda2.wght -@summ-@qtyremtot fROM sauda2 where sauda2.sno = @c2sno and main_bk = 'SD'
	end
  	 else
		if @bltype = 'V' 
			Begin
				select @summ = sum(sauda2.rateper),@qtyremtot =sum(sauda2.qty_rem) from  sauda2 where sauda2.cont2_sno = @c2sno group by sauda2.cont2_sno		
				UPDATE sauda2 SET sauda2.qty_exe = @summ,sauda2.qty_rem = @qtyremtot ,sauda2.qty_bal = sauda2.rateper -@summ-@qtyremtot fROM sauda2 where sauda2.sno = @c2sno and main_bk = 'SD'
			end
		else
			Begin
				select @summ = sum(sauda2.bag),@qtyremtot =sum(sauda2.qty_rem)  from  sauda2 where sauda2.cont2_sno = @c2sno group by sauda2.cont2_sno	
				UPDATE sauda2 SET sauda2.qty_exe = @summ,sauda2.qty_rem = @qtyremtot ,sauda2.qty_bal = sauda2.bag -@summ-@qtyremtot fROM sauda2 where sauda2.sno = @c2sno and main_bk = 'SD'
			end

	select @c2sno = sno from sauda2 where yr =  @c2yr and cocode = @c2cocode and main_bk = @c2mnbk AND c_j_s_p = @c2cjsp and   vouc_code =  @c2vouccode and vouc_chr = @c2voucchr and sr_no = @c2srno and typ = 'BR'
	insert into sauda2(cont_sno,cont2_sno,yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,sddate,p_code,typ,it_code,brnd_code,bag,pck,qltydet,wght,qty_exe,qty_rem,qty_bal,g_n,k_rate,b_rate,w_q,amount,slbrk_rt,slbrk_typ,slbrk_amt,brbrk_rt,brbrk_typ,brbrk_amt,sr_no,rateper) 
	values                   (@vcd,@c2sno ,@yr,@cocode,@mnbk,@cjsp,@vvcd,@voucchr,@sddate,@brcode,'BR',@itcode,@brndcode,@bag,@pck,@ipck,@wght,@qtyexe,@qtyrem,@qtybal,@gn,@krate,@brate,@wq,@amt,@slbrkrt,@slbrktyp,@slbrkamt,@brbrkrt,@brbrktyp,@brbrkamt,@srno,@rateper)	
	select @summ = 0,@qtyremtot =0
	if @bltype = 'W' 
	Begin
		select @summ = sum(sauda2.wght),@qtyremtot =sum(sauda2.qty_rem) from  sauda2 where sauda2.cont2_sno = @c2sno group by sauda2.cont2_sno		
		UPDATE sauda2 SET sauda2.qty_exe = @summ,sauda2.qty_rem = @qtyremtot ,sauda2.qty_bal = sauda2.wght -@summ-@qtyremtot fROM sauda2 where sauda2.sno = @c2sno and main_bk = 'SD'
	end
	else
		if @bltype = 'V' 
			Begin
				select @summ = sum(sauda2.rateper),@qtyremtot =sum(sauda2.qty_rem) from  sauda2 where sauda2.cont2_sno = @c2sno group by sauda2.cont2_sno		
				UPDATE sauda2 SET sauda2.qty_exe = @summ,sauda2.qty_rem = @qtyremtot ,sauda2.qty_bal = sauda2.rateper -@summ-@qtyremtot fROM sauda2 where sauda2.sno = @c2sno and main_bk = 'SD'
			end
		else
			Begin
				select @summ = sum(sauda2.bag),@qtyremtot =sum(sauda2.qty_rem)  from  sauda2 where sauda2.cont2_sno = @c2sno group by sauda2.cont2_sno	
				UPDATE sauda2 SET sauda2.qty_exe = @summ,sauda2.qty_rem = @qtyremtot ,sauda2.qty_bal = sauda2.bag -@summ-@qtyremtot fROM sauda2 where sauda2.sno = @c2sno and main_bk = 'SD'
			end

	select @c2sno = sno from sauda2 where yr =  @c2yr and cocode = @c2cocode and main_bk = @c2mnbk AND c_j_s_p = @c2cjsp and   vouc_code =  @c2vouccode and vouc_chr = @c2voucchr and sr_no = @c2srno and typ = 'BB'
	insert into sauda2(cont_sno,cont2_sno,yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,sddate,p_code,typ,it_code,brnd_code,bag,pck,qltydet,wght,qty_exe,qty_rem,qty_bal,g_n,k_rate,b_rate,w_q,amount,slbrk_rt,slbrk_typ,slbrk_amt,brbrk_rt,brbrk_typ,brbrk_amt,sr_no,rateper) 
	values                   (@vcd,@c2sno ,@yr,@cocode,@mnbk,@cjsp,@vvcd,@voucchr,@sddate,@bbcode,'BB',@itcode,@brndcode,@bag,@pck,@ipck,@wght,@qtyexe,@qtyrem,@qtybal,@gn,@krate,@brate,@wq,@amt,@slbrkrt,@slbrktyp,@slbrkamt,@brbrkrt,@brbrktyp,@brbrkamt,@srno,@rateper)	
	select @summ = 0,@qtyremtot =0

	if @bltype = 'W' 
	Begin
		select @summ = sum(sauda2.wght),@qtyremtot =sum(sauda2.qty_rem) from  sauda2 where sauda2.cont2_sno = @c2sno group by sauda2.cont2_sno		
		UPDATE sauda2 SET sauda2.qty_exe = @summ,sauda2.qty_rem = @qtyremtot ,sauda2.qty_bal = sauda2.wght -@summ-@qtyremtot fROM sauda2 where sauda2.sno = @c2sno and main_bk = 'SD'
	end
	else
		if @bltype = 'V' 
			Begin
				select @summ = sum(sauda2.rateper),@qtyremtot =sum(sauda2.qty_rem) from  sauda2 where sauda2.cont2_sno = @c2sno group by sauda2.cont2_sno		
				UPDATE sauda2 SET sauda2.qty_exe = @summ,sauda2.qty_rem = @qtyremtot ,sauda2.qty_bal = sauda2.rateper -@summ-@qtyremtot fROM sauda2 where sauda2.sno = @c2sno and main_bk = 'SD'
			end
		else
			Begin
				select @summ = sum(sauda2.bag),@qtyremtot =sum(sauda2.qty_rem)  from  sauda2 where sauda2.cont2_sno = @c2sno group by sauda2.cont2_sno	
				UPDATE sauda2 SET sauda2.qty_exe = @summ,sauda2.qty_rem = @qtyremtot ,sauda2.qty_bal = sauda2.bag -@summ-@qtyremtot fROM sauda2 where sauda2.sno = @c2sno and main_bk = 'SD'
			end



	 SET NOCOUNT ON 
	RETURN



---------------------------

set ANSI_NULLS ON
set QUOTED_IDENTIFIER ON


set ANSI_NULLS ON
set QUOTED_IDENTIFIER ON
GO
/****** Object:  StoredProcedure [dbo].[AddDistmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS OFF
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[AddDistmst] 	
	(@acname varchar(50),@stcode int,@acarea money,@acpop money) 
	
AS	 
	insert into distmst (dist_nm,state_cd,dist_area,dist_pop) values (@acname,@stcode,@acarea,@acpop) 

 SET NOCOUNT ON 
	RETURN

GO
/****** Object:  StoredProcedure [dbo].[AddExpmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO




CREATE PROCEDURE [dbo].[AddExpmst] 	
	(@acname varchar(50),@actype varchar(2)) 
	
AS	 
	insert into expmst (expnm,type) values (@acname,@actype) 

 SET NOCOUNT ON 
	RETURN




GO
/****** Object:  StoredProcedure [dbo].[AddItemmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


CREATE PROCEDURE [dbo].[AddItemmst]
	(
	@itemsno int output,@itemstpsno int,@descri varchar(50),@itemdescr varchar(100),@itemunit varchar(10),@itemshtnm varchar(10),@grp varchar(50),@itpck money,@itbk varchar(5),@itratesl money,@itratetypsl varchar(5),@itratebr money,@itratetypbr varchar(5))
AS	 
	declare @ssno int
	Select @ssno =0
	Select @ssno = sno from itemmst where sno=@itemsno
	if  @ssno=0 
	     Begin 
		     Select @ssno = sno from itemmst where item_nm=@descri
		     if  @ssno=0 
	  	     Begin
		        insert into itemmst (item_nm,item_grp,item_descr,item_unit,item_shtnm) values (@descri,@grp,@itemdescr,@itemunit,@itemshtnm) 
		        Select @ssno = sno from itemmst where item_nm=@descri
		     end
             Select @itemsno= sno from itemmst where item_nm=@descri
		 end
    else
         Begin 
	           update itemmst set item_nm=@descri ,item_grp=@grp,item_descr =@itemdescr ,item_unit=@itemunit,item_shtnm = @itemshtnm where sno =@itemsno
			   Select @ssno =@itemsno
         end                   
	if @itemstpsno=0 
	   BEGIN
		if @itpck>0
		  Begin
			insert into itemstp (it_sno,it_pck,it_bk,it_ratesl,it_ratetypsl,it_ratebr,it_ratetypbr) values
				  (@ssno,@itpck,@itbk,@itratesl,@itratetypsl,@itratebr,@itratetypbr) 
		  end	
	   END
	else 
	     BEGIN	
		update itemstp set it_sno = @ssno,it_pck=@itpck,it_bk=@itbk,it_ratesl=@itratesl,it_ratetypsl=@itratetypsl,it_ratebr=@itratebr,it_ratetypbr=@itratetypbr where sno =@itemstpsno
	     END	
		
	 SET NOCOUNT ON 
	RETURN







set ANSI_NULLS ON
set QUOTED_IDENTIFIER ON

GO
/****** Object:  StoredProcedure [dbo].[AddItemspec]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [dbo].[AddItemspec]
	(
	@itemstpsno int,@spec_nm varchar(50),@spec_val money,@spec_minmax varchar(5),@spec_rmk varchar(100))
AS	 
INSERT INTO [brokermast].[dbo].[itemspec]
           (itm_sno,[spec_nm]
           ,[spec_val]
           ,[spec_minmax]
           ,[spec_rmk])
     VALUES
           (@itemstpsno,@spec_nm,@spec_val,@spec_minmax,@spec_rmk)	
 SET NOCOUNT ON 
	RETURN




GO
/****** Object:  StoredProcedure [dbo].[AddLclDalali]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO



CREATE PROCEDURE [dbo].[AddLclDalali]
	(@yr varchar(10),@cocode int, @mnbk varchar(5),@cjsp varchar(5),@vouccode int,@voucchr varchar(1),@sddate datetime,
	@slcode int,@brcode int,@brcont varchar(50),@rmks varchar(150),
	@itcode int,@brndcode int,@bag money,@pck money,@ipck varchar(25),@wght money,@qtyexe money,@qtybal money,@gn varchar(1),@krate money,@brate money,@wq varchar(1),
	@amt money,@slbrkrt money, @slbrktyp varchar(5),@slbrkamt money,@brbrkrt money, @brbrktyp varchar(5),@brbrkamt money,@srno int,@cont2sno int,
	@motno varchar(35),@add1rmk varchar(35),@add1amt money,@add2rmk varchar(35),@add2amt money,@add3rmk varchar(35),@add3amt money,
	@less1rmk varchar(35),@less1amt money,@less2rmk varchar(35),@less2amt money,@less3rmk varchar(35),@less3amt money  )	
AS	 
	declare @vvcd int
	select @vvcd = @vouccode
	declare @vcd int
	select @vcd = 0
	declare @c2sno int
	declare @c2yr varchar(10)
	declare @c2cocode int
	declare @c2mnbk varchar(5)
	declare @c2cjsp varchar(5)
	declare @c2vouccode int
	declare @c2srno int
	declare @c2voucchr varchar(1)

	select @c2yr = yr from sauda2 where sno = @cont2sno
	select @c2cocode = cocode from sauda2 where sno = @cont2sno
	select @c2mnbk = main_bk from sauda2 where sno = @cont2sno
	select @c2cjsp =c_j_s_p from sauda2 where sno = @cont2sno
	select @c2vouccode = vouc_code from sauda2 where sno = @cont2sno
	select @c2srno = sr_no from sauda2 where sno = @cont2sno
	select @c2voucchr = vouc_chr from sauda2 where sno = @cont2sno
    UPDATE    sauda2 SET sauda2.qty_exe = 0, sauda2.qty_bal = sauda2.wght 
	select @c2sno = 0
	select @vcd = sno from sauda1 where yr =  @yr and cocode = @cocode and main_bk = @mnbk AND c_j_s_p = @cjsp and   vouc_code =  @vvcd and vouc_chr = @voucchr
	declare @sdsno int	
	select @sdsno = 0		
	if @vcd = 0
	BEGIN
		insert into sauda1(yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,sd_date,br_code,br_cont,sl_brok,br_brok,brok_yn,mot_no,add1_rmk,add1_amt,add2_rmk,add2_amt,add3_rmk,add3_amt,less1_rmk,less1_amt,less2_rmk,less2_amt,less3_rmk,less3_amt,rmks) 
		values (@yr,@cocode,@mnbk,@cjsp,@vvcd,@voucchr,@sddate,@brcode,@brcont,'Y','Y','Y',@motno,@add1rmk,@add1amt,@add2rmk,@add2amt,@add3rmk,@add3amt,@less1rmk,@less1amt,@less2rmk,@less2amt,@less3rmk,@less3amt,@rmks)		
	END 
	select @vcd = sno from sauda1 where yr =  @yr and cocode = @cocode and main_bk = @mnbk AND c_j_s_p = @cjsp and   vouc_code =  @vvcd and vouc_chr = @voucchr

	select @c2sno = sno from sauda2 where yr =  @c2yr and cocode = @c2cocode and main_bk = @c2mnbk AND c_j_s_p = @c2cjsp and   vouc_code =  @c2vouccode and vouc_chr = @c2voucchr and sr_no = @c2srno and typ = 'SL'
	insert into sauda2(cont_sno,cont2_sno,yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,sddate,p_code,op_code,typ,it_code,brnd_code,bag,pck,ipck,wght,qty_exe,qty_bal,g_n,k_rate,b_rate,w_q,amount,slbrk_rt,slbrk_typ,slbrk_amt,brbrk_rt,brbrk_typ,brbrk_amt,sr_no) 
	values                   (@vcd,@c2sno ,@yr,@cocode,@mnbk,@cjsp,@vvcd,@voucchr,@sddate,@slcode,@brcode,'SL',@itcode,@brndcode,@bag,@pck,@ipck,@wght,@qtyexe,@qtybal,@gn,@krate,@brate,@wq,@amt,@slbrkrt,@slbrktyp,@slbrkamt,@brbrkrt,@brbrktyp,@brbrkamt,@srno)	
	select @c2sno = sno from sauda2 where yr =  @c2yr and cocode = @c2cocode and main_bk = @c2mnbk AND c_j_s_p = @c2cjsp and   vouc_code =  @c2vouccode and vouc_chr = @c2voucchr and sr_no = @c2srno and typ = 'BR'
	insert into sauda2(cont_sno,cont2_sno,yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,sddate,p_code,op_code,typ,it_code,brnd_code,bag,pck,ipck,wght,qty_exe,qty_bal,g_n,k_rate,b_rate,w_q,amount,slbrk_rt,slbrk_typ,slbrk_amt,brbrk_rt,brbrk_typ,brbrk_amt,sr_no) 
	values                   (@vcd,@c2sno ,@yr,@cocode,@mnbk,@cjsp,@vvcd,@voucchr,@sddate,@brcode,@slcode,'BR',@itcode,@brndcode,@bag,@pck,@ipck,@wght,@qtyexe,@qtybal,@gn,@krate,@brate,@wq,@amt,@slbrkrt,@slbrktyp,@slbrkamt,@brbrkrt,@brbrktyp,@brbrkamt,@srno)	
	
	 SET NOCOUNT ON 
	RETURN




GO
/****** Object:  StoredProcedure [dbo].[AddNarrmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS OFF
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[AddNarrmst] 	
	(@acname varchar(250),@actype varchar(25)) 
	
AS	 
	insert into narrmst (narration,type) values (@acname,@actype) 

 SET NOCOUNT ON 
	RETURN

GO
/****** Object:  StoredProcedure [dbo].[Addorddelv]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[Addorddelv]
	(@yr varchar(10),@cocode int, @mnbk varchar(5),@cjsp varchar(5),@vouccode int,@voucchr varchar(1),
	@srno int,@ordsno int)	

AS	 
	BEGIN
		insert into ord_delv(yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,sr_no,ord_sno) 
		values (@yr,@cocode,@mnbk,@cjsp,@vouccode,@voucchr,@srno,@ordsno)		
	END 
	
	 SET NOCOUNT ON 
	RETURN








GO
/****** Object:  StoredProcedure [dbo].[AddOrder]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO




CREATE PROCEDURE [dbo].[AddOrder]
	(@yr varchar(10),@cocode int, @mnbk varchar(5),@cjsp varchar(5),@vouccode int,@voucchr varchar(1),@sddate datetime,
	@slcode int,@sbcode int,@brcode int,@bbcode int,@slcont varchar(50),@sbcont varchar(50),@brcont varchar(50),@bbcont varchar(50),
	@pono varchar(50),@podate varchar(50),@delvfr varchar(50),@delvto varchar(50),@term int,@fromct int , @toct int,@paycond varchar(1),@disccrdrt money,@form varchar(1),@rmks varchar(150),
	@itcode int,@brndcode int,@bag money,@pck money,@ipck varchar(25),@wght money,@qtyexe money,@qtybal money,@gn varchar(1),@krate money,@brate money,@wq varchar(1),
	@amt money,@srno int)	

AS	 
	declare @vvcd int
	select @vvcd = @vouccode
	declare @vcd int
	select @vcd = 0
	select @vcd = sno from sauda1 where yr =  @yr and cocode = @cocode and main_bk = @mnbk AND c_j_s_p = @cjsp and   vouc_code =  @vvcd and vouc_chr = @voucchr
	declare @sdsno int	
	select @sdsno = 0		
	if @vcd = 0
	BEGIN
		insert into sauda1(yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,sd_date,sl_code,sb_code,br_code,bb_code,sl_cont,sb_cont,br_cont,bb_cont,pono,podt,delv_fr,delv_to,term,from_ct,to_ct,paycond,paydiscrt,cform,rmks) 
		values (@yr,@cocode,@mnbk,@cjsp,@vvcd,@voucchr,@sddate,@slcode,@sbcode,@brcode,@bbcode,@slcont,@sbcont,@brcont,@bbcont,@pono,@podate,@delvfr,@delvto,@term,@fromct,@toct,@paycond,@disccrdrt,@form,@rmks)		
	END 
	select @vcd = sno from sauda1 where yr =  @yr and cocode = @cocode and main_bk = @mnbk AND c_j_s_p = @cjsp and   vouc_code =  @vvcd and vouc_chr = @voucchr		
	insert into sauda2(cont_sno,yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,sddate,p_code,typ,it_code,brnd_code,bag,pck,ipck,wght,qty_exe,qty_bal,g_n,k_rate,b_rate,w_q,amount,sr_no) 
	values                   (@vcd,@yr,@cocode,@mnbk,@cjsp,@vvcd,@voucchr,@sddate,@slcode,'SL',@itcode,@brndcode,@bag,@pck,@ipck,@wght,@qtyexe,@qtybal,@gn,@krate,@brate,@wq,@amt,@srno)	
	insert into sauda2(cont_sno,yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,sddate,p_code,typ,it_code,brnd_code,bag,pck,ipck,wght,qty_exe,qty_bal,g_n,k_rate,b_rate,w_q,amount,sr_no) 
	values                   (@vcd,@yr,@cocode,@mnbk,@cjsp,@vvcd,@voucchr,@sddate,@sbcode,'SB',@itcode,@brndcode,@bag,@pck,@ipck,@wght,@qtyexe,@qtybal,@gn,@krate,@brate,@wq,@amt,@srno)	
	insert into sauda2(cont_sno,yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,sddate,p_code,typ,it_code,brnd_code,bag,pck,ipck,wght,qty_exe,qty_bal,g_n,k_rate,b_rate,w_q,amount,sr_no) 
	values                   (@vcd,@yr,@cocode,@mnbk,@cjsp,@vvcd,@voucchr,@sddate,@brcode,'BR',@itcode,@brndcode,@bag,@pck,@ipck,@wght,@qtyexe,@qtybal,@gn,@krate,@brate,@wq,@amt,@srno)	
	insert into sauda2(cont_sno,yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,sddate,p_code,typ,it_code,brnd_code,bag,pck,ipck,wght,qty_exe,qty_bal,g_n,k_rate,b_rate,w_q,amount,sr_no) 
	values                   (@vcd,@yr,@cocode,@mnbk,@cjsp,@vvcd,@voucchr,@sddate,@bbcode,'BB',@itcode,@brndcode,@bag,@pck,@ipck,@wght,@qtyexe,@qtybal,@gn,@krate,@brate,@wq,@amt,@srno)	

	 SET NOCOUNT ON 
	RETURN


GO
/****** Object:  StoredProcedure [dbo].[AddPaydet]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[AddPaydet]
	(@yr varchar(10),@cocode int, @mnbk varchar(5),@cjsp varchar(5),@vouccode int,@voucchr varchar(1),@sddate datetime,
	@adjsno int,@expcode int,@exprate money,@expamt money)	
AS	 
	declare @adjyr varchar(10),	@adjcocode int,@adjmnbk varchar(5),@adjcjsp varchar(5),@adjvouccode int,@adjvoucchr varchar(1)       
	
	select @adjyr = yr from outstanding where sno = @adjsno
	select @adjcocode = cocode from outstanding where sno = @adjsno
	select @adjmnbk = main_bk from outstanding where sno = @adjsno
	select @adjcjsp =c_j_s_p from outstanding where sno = @adjsno
	select @adjvouccode = vouc_code from outstanding where sno = @adjsno
	select @adjvoucchr = vouc_chr from outstanding where sno = @adjsno

	declare @sdsno int	
	select @sdsno = 0		

	insert into outsdet(yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,sd_date,adj_yr,adj_cocode,adj_main_bk,adj_c_j_s_p,adj_vouc_code,adj_vouc_chr,exp_code,exp_rate,exp_amt) 
	values (@yr,@cocode,@mnbk,@cjsp,@vouccode,@voucchr,@sddate,@adjyr,@adjcocode,@adjmnbk,@adjcjsp,@adjvouccode,@adjvoucchr,@expcode,@exprate,@expamt)

	 SET NOCOUNT ON 
	RETURN






GO
/****** Object:  StoredProcedure [dbo].[AddPayment]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


CREATE PROCEDURE [dbo].[AddPayment]
	(@yr varchar(10),@cocode int, @mnbk varchar(5),@cjsp varchar(5),@vouccode int,@voucchr varchar(1),@sddate datetime,
	@slcode int,@brcode int, @chkddtyp varchar(20),@chkddno varchar(40),@chkdddt datetime,@chkddamt money,
    @dep_bnk int,@dep_ac char(100),@courier int,@cou_rec char(25),@cou_chgs money,@rmks1 char(150),@rmks2 char(150),
	@adjsno int,@adjamt money,@adjexpamt money)	
AS	 
	declare @vvcd int
	select @vvcd = @vouccode
	declare @vcd int
	select @vcd = 0

	declare @recamt money,@bargamt money,@expamt money,@clramt money

	declare @adjyr varchar(10)
	declare @adjcocode int
	declare @adjmnbk varchar(5)
	declare @adjcjsp varchar(5) 
	declare @adjvouccode int
	declare @adjvoucchr varchar(1)       
	declare @adjsbcode int
	declare @adjbbcode int
	declare @adjpono varchar(50)       
	declare @adjpodt varchar(10)       
	
	select @adjyr = yr from outstanding where sno = @adjsno
	select @adjcocode = cocode from outstanding where sno = @adjsno
	select @adjmnbk = main_bk from outstanding where sno = @adjsno
	select @adjcjsp =c_j_s_p from outstanding where sno = @adjsno
	select @adjvouccode = vouc_code from outstanding where sno = @adjsno
	select @adjvoucchr = vouc_chr from outstanding where sno = @adjsno
	select @adjsbcode = sb_code from outstanding where sno = @adjsno
	select @adjbbcode = bb_code from outstanding where sno = @adjsno
	select @adjpono = pono from outstanding where sno = @adjsno
	select @adjpodt = podt from outstanding where sno = @adjsno
	

    select @vcd = sno from payment where yr =  @yr and cocode = @cocode and main_bk = @mnbk AND c_j_s_p = @cjsp and   vouc_code =  @vvcd and vouc_chr = @voucchr
	declare @sdsno int	
	select @sdsno = 0		
	if @vcd = 0
	BEGIN
		insert into payment(yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,pay_date,sl_code,br_code,chkddtyp,chkddno,chkdddt,chkddamt,dep_bnk,dep_ac,courier,cou_rec,cou_chgs,rmks1,rmks2) 
		values (@yr,@cocode,@mnbk,@cjsp,@vvcd,@voucchr,@sddate,@slcode,@brcode,@chkddtyp,@chkddno,@chkdddt,@chkddamt,@dep_bnk,@dep_ac,@courier,@cou_rec,@cou_chgs,@rmks1,@rmks2)		
	END 
	insert into outstanding(yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,sd_date,adj_yr,adj_cocode,adj_main_bk,adj_c_j_s_p,adj_vouc_code,adj_vouc_chr,sl_code,sb_code,br_code,bb_code,pono,podt,Outs_amt,Outs_exp,Outs_clr,Outs_bal) 
	values (@yr,@cocode,@mnbk,@cjsp,@vvcd,@voucchr,@sddate,@adjyr,@adjcocode,@adjmnbk,@adjcjsp,@adjvouccode,@adjvoucchr,@slcode,@adjsbcode,@brcode,@adjbbcode,@adjpono,@adjpodt,@adjamt,@adjexpamt,0,0)


	select @bargamt= sauda1.barg_amt from  sauda1 where (sauda1.yr = @adjyr) and (sauda1.cocode = @adjcocode) and (sauda1.main_bk = @adjmnbk) and (sauda1.c_j_s_p = @adjcjsp) and (sauda1.vouc_code = @adjvouccode) and (sauda1.vouc_chr = @adjvoucchr) 

	select @recamt=0,@expamt=0,@clramt=0
	select @recamt= sum(outstanding.outs_amt),@expamt= sum(outstanding.outs_exp),@clramt= sum(outstanding.outs_clr) from  outstanding where outstanding.adj_yr = @adjyr and outstanding.adj_cocode = @adjcocode and outstanding.adj_main_bk = @adjmnbk and outstanding.adj_c_j_s_p = @adjcjsp and outstanding.adj_vouc_code = @adjvouccode and outstanding.adj_vouc_chr = @adjvoucchr and  outstanding.main_bk = 'PAY' group by outstanding.adj_yr,outstanding.adj_cocode,outstanding.adj_main_bk,outstanding.adj_c_j_s_p,outstanding.adj_vouc_code,outstanding.adj_vouc_chr

	UPDATE outstanding
	SET outstanding.outs_amt = @bargamt,outstanding.outs_rec = @recamt,outstanding.outs_exp = @expamt,outstanding.outs_clr = @clramt,outstanding.outs_bal = @bargamt- @recamt-@expamt-@clramt
	fROM outstanding where outstanding.sno = @adjsno
	

	 SET NOCOUNT ON 
	RETURN







GO
/****** Object:  StoredProcedure [dbo].[AddPmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[AddPmst] 	
	(@acptype varchar(10),@acname varchar(50),@acadd1 varchar(50),@acadd2 varchar(50),@acareanm varchar(40),@acplace int,@acpin varchar(6),
    @acsie varchar(1),@accont varchar(50),@acpho varchar(50),@acphr varchar(50),@acphm varchar(50),@actin varchar(50),
	@acpan varchar(50),@gsno int,@chrcode varchar(150),@opbal money,@opbaldc varchar(2),@opdt datetime,@billprty int,@acemail varchar(50),
	@acpho1 varchar(25),@acvat varchar(50),@acpho2 varchar(25),@acpho3 varchar(25),@acphr1 varchar(25),@acphm1 varchar(25),
	@accont1 varchar(50),@acgrp varchar(25),@acdelvnm varchar(50),@acdelvadd1 varchar(50),@acdelvadd2 varchar(50),@acdelvplace int,
	@acdelvpin varchar(6),@acdelvsie varchar(1),@acdelvtin varchar(50),@acdelvpan varchar(50),@acdelvvat varchar(50),@acdelvpho1 varchar(25),
	@acdelvpho2 varchar(25),@acdelvphm1 varchar(25),@acdelvphm2 varchar(25),@acbnkac1 varchar(25),@acbnkac2 varchar(25),@ac_gstin varchar(50),
	@acbnkac3 varchar(25),@acbnk1 int,@acbnk2 int,@acbnk3 int,@acemail1 varchar(50),@acweb varchar(50),@accate varchar(1),@aclimit money,
	@acwork varchar(1),@acmail varchar(1),@hopbal money,@hopbaldc varchar(2),@hopdt datetime,@acemail2 varchar(50),@acemail3 varchar(50),
	@accont2 varchar(50),@accont3 varchar(50),@accontfrm1 varchar(25),@accontfrm2 varchar(25),@accontfrm3 varchar(25),@accontfrm4 varchar(25),
	@acssevausr varchar(50),@acssevapwd varchar(10),@pcd int output) 	
AS	 
	declare @accode int
	insert into accountmst (p_type,ac_name,ac_add1,ac_add2,ac_area,ac_place,ac_pin,ac_sie,ac_cont,ac_pho,ac_phr,ac_phm,ac_tin,ac_gstin,ac_pan,g_sno,rmk,
		    bill_prty,ac_email,ac_pho1,ac_vat,ac_pho2,ac_pho3,ac_phr1,ac_phm1,ac_cont1,ac_grp,ac_delvnm,ac_delvadd1,ac_delvadd2,ac_delvplace,
			ac_delvpin,ac_delvsie,ac_delvtin,ac_delvpan,ac_delvvat,ac_delvpho1,ac_delvpho2,ac_delvphm1,ac_delvphm2,ac_bnkac1,ac_bnkac2,ac_bnkac3,
			ac_bnk1,ac_bnk2,ac_bnk3,ac_email1,ac_web,ac_cate,ac_work,ac_mail,ac_email2,ac_email3,ac_cont2,ac_cont3,ac_contfrm1,ac_contfrm2,ac_contfrm3,ac_contfrm4,ac_ssevausr,ac_ssevapwd,ac_limit ) values 
			(@acptype,@acname,@acadd1,@acadd2,@acareanm,@acplace,@acpin,@acsie,@accont,@acpho,@acphr,@acphm,
		    @actin,@ac_gstin,@acpan,@gsno,@chrcode,@billprty,@acemail,@acpho1,@acvat,@acpho2,@acpho3 ,@acphr1 ,@acphm1,
	@accont1 ,@acgrp ,@acdelvnm ,@acdelvadd1 ,@acdelvadd2 ,@acdelvplace ,@acdelvpin ,@acdelvsie,@acdelvtin,@acdelvpan,@acdelvvat ,@acdelvpho1,
	@acdelvpho2,@acdelvphm1,@acdelvphm2,@acbnkac1,@acbnkac2 ,@acbnkac3,@acbnk1,@acbnk2,@acbnk3,@acemail1,@acweb,@accate,@acwork,@acmail,
		@acemail2,@acemail3,@accont2 ,@accont3 ,@accontfrm1 ,@accontfrm2 ,@accontfrm3 ,@accontfrm4,@acssevausr ,@acssevapwd,@aclimit) 
	select @accode = max(sno) from accountmst
	Select @pcd = @accode
	if @opbal <> 0 
	begin
	     insert into brokerdb1.dbo.trans (main_bk,c_j_s_p,pcd,d_a_t_e,amount,d_c) values ('OP','OP',@accode,@opdt,@opbal,@opbaldc) 
	end
	if @hopbal <> 0 
	begin
	     insert into brokerdb1.dbo.trans (main_bk,c_j_s_p,pcd,d_a_t_e,amount,d_c) values ('HOP','HOP',@accode,@hopdt,@hopbal,@hopbaldc) 
	end
	
 SET NOCOUNT ON 
	RETURN 


set ANSI_NULLS ON
set QUOTED_IDENTIFIER ON
GO
/****** Object:  StoredProcedure [dbo].[Addpropmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS OFF
GO
SET QUOTED_IDENTIFIER ON
GO



CREATE PROCEDURE [dbo].[Addpropmst] 	
	(
	@acname varchar(50),@acadd1 varchar(50),@acadd2 varchar(50),@acplace int,@acpin varchar(6),@accont varchar(50),@acpho varchar(50),@acphr varchar(50),@acphm varchar(50),@actin varchar(50),@acpan varchar(50),@acemail varchar(50)) 
	
AS	 
	insert into propmst (ac_name,ac_add1,ac_add2,ac_place,ac_pin,ac_cont,ac_pho,ac_phr,ac_phm,ac_tin,ac_pan,ac_email) values (@acname,@acadd1,@acadd2,@acplace,@acpin,@accont,@acpho,@acphr,@acphm,@actin,@acpan,@acemail) 
 SET NOCOUNT ON 
	RETURN

GO
/****** Object:  StoredProcedure [dbo].[AddPrtItemstp]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS OFF
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[AddPrtItemstp]
	(
	@itemsno int,@itemstpsno int,@itemprtsno int,@itpck money,@itratesl money,@itratetypsl varchar(5),@itratebr money,@itratetypbr varchar(5))
AS	 
	declare @ssno int
	Select @ssno =0
	if @itemstpsno=0 
	   BEGIN
		insert into prtitemstp(it_sno,prt_sno,it_pck,it_ratesl,it_ratetypsl,it_ratebr,it_ratetypbr) values
				  (@itemsno,@itemprtsno,@itpck,@itratesl,@itratetypsl,@itratebr,@itratetypbr) 
	   END
	else 
	     BEGIN	
		update prtitemstp set it_sno = @itemsno,prt_sno=@itemprtsno ,it_pck=@itpck,it_ratesl=@itratesl,it_ratetypsl=@itratetypsl,it_ratebr=@itratebr,it_ratetypbr=@itratetypbr where sno =@itemstpsno
	     END	
		
	 SET NOCOUNT ON 
	RETURN

GO
/****** Object:  StoredProcedure [dbo].[AddSauda]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


CREATE PROCEDURE [dbo].[AddSauda]
	(@yr varchar(10),@cocode int, @mnbk varchar(5),@cjsp varchar(5),@vouccode int,@voucchr varchar(1),@sddate datetime,
	@slcode int,@sbcode int,@brcode int,@bbcode int,@slcont varchar(50),@sbcont varchar(50),@brcont varchar(250),@bbcont varchar(50),
	@slbrok varchar(1),@sbbrok varchar(1),@brbrok varchar(1),@bbbrok varchar(1),@brok varchar(1), @pono varchar(50),@podate varchar(50),@discrt money,
	@delvfr varchar(50),@delvto varchar(50),@term int,@fromct int , @toct int,@paycond varchar(1),@disccrdrt money,@form varchar(1),@rmks varchar(150),
	@itcode int,@brndcode int,@bag money,@pck money,@ipck varchar(25),@wght money,@qtyexe money,@qtybal money,@gn varchar(1),@krate money,@brate money,@wq varchar(1),
	@amt money,@slbrkrt money, @slbrktyp varchar(5),@slbrkamt money,@brbrkrt money, @brbrktyp varchar(5),@brbrkamt money,@srno int,@currt money,@cursym varchar(10),
	@paydet varchar(250),@delvdet varchar(50),@bnkdet varchar(250),@arbit varchar(250),@qltydet varchar(50),@pckunit varchar(10),@pcktype varchar(5),@pckdet varchar(150),
	@delvload varchar(25),@origin varchar(50),@add1rmk varchar(35),@add1amt money,@add2rmk varchar(35),@add2amt money,@add3rmk varchar(35),@add3amt money,@apprxwght varchar(50),
	@wghtunit varchar(5),@rateper money,@shipmark varchar(200),@slrbnkdet varchar(250),@wghtterm varchar(100),@priceterm varchar(50),@inspdet varchar(100),@shipdet varchar(50),@cont2sno int output)	

AS	 
	declare @vvcd int
	select @vvcd = @vouccode
	declare @vcd int
	select @vcd = 0
	select @vcd = sno from sauda1 where yr =  @yr and cocode = @cocode and main_bk = @mnbk AND c_j_s_p = @cjsp and   vouc_code =  @vvcd and vouc_chr = @voucchr
	declare @sdsno int	
	select @sdsno = 0		
	if @vcd = 0
	BEGIN
		insert into sauda1(yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,sd_date,sl_code,sb_code,br_code,bb_code,sl_cont,sb_cont,br_cont,bb_cont,sl_brok,sb_brok,br_brok,bb_brok,brok_yn,pono,podt,delv_fr,delv_to,term,from_ct,to_ct,paycond,paydiscrt,cform,rmks,delvdet,bankdet,arbit,paydet,cur_rt,cur_sym,shipmark,slr_bnkdet,wght_term,price_term,insp_det,ship_det,delv_load,origin,add1_rmk,add1_amt,add2_rmk,add2_amt,add3_rmk,add3_amt,apprxwght,discrt) 
		values (@yr,@cocode,@mnbk,@cjsp,@vvcd,@voucchr,@sddate,@slcode,@sbcode,@brcode,@bbcode,@slcont,@sbcont,@brcont,@bbcont,@slbrok,@sbbrok,@brbrok,@bbbrok,@brok,@pono,@podate,@delvfr,@delvto,@term,@fromct,@toct,@paycond,@disccrdrt,@form,@rmks,@delvdet,@bnkdet,@arbit,@paydet,@currt,@cursym,@shipmark,@slrbnkdet,@wghtterm,@priceterm,@inspdet,@shipdet,@delvload,@origin,@add1rmk,@add1amt,@add2rmk,@add2amt,@add3rmk,@add3amt,@apprxwght,@discrt)		
	END 
	select @vcd = sno from sauda1 where yr =  @yr and cocode = @cocode and main_bk = @mnbk AND c_j_s_p = @cjsp and   vouc_code =  @vvcd and vouc_chr = @voucchr		
	insert into sauda2(cont_sno,yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,sddate,p_code,typ,it_code,brnd_code,bag,pck,ipck,wght,qty_exe,qty_bal,g_n,k_rate,b_rate,w_q,amount,slbrk_rt,slbrk_typ,slbrk_amt,brbrk_rt,brbrk_typ,brbrk_amt,sr_no,qltydet,pckunit,pcktype,pckdet,wghtunit,rateper) 
	values                   (@vcd,@yr,@cocode,@mnbk,@cjsp,@vvcd,@voucchr,@sddate,@slcode,'SL',@itcode,@brndcode,@bag,@pck,@ipck,@wght,@qtyexe,@qtybal,@gn,@krate,@brate,@wq,@amt,@slbrkrt,@slbrktyp,@slbrkamt,@brbrkrt,@brbrktyp,@brbrkamt,@srno,@qltydet,@pckunit,@pcktype,@pckdet,@wghtunit,@rateper)	
	select @cont2sno = max(sno) from sauda2
	insert into sauda2(cont_sno,yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,sddate,p_code,typ,it_code,brnd_code,bag,pck,ipck,wght,qty_exe,qty_bal,g_n,k_rate,b_rate,w_q,amount,slbrk_rt,slbrk_typ,slbrk_amt,brbrk_rt,brbrk_typ,brbrk_amt,sr_no,qltydet,pckunit,pcktype,pckdet,wghtunit,rateper) 
	values                   (@vcd,@yr,@cocode,@mnbk,@cjsp,@vvcd,@voucchr,@sddate,@sbcode,'SB',@itcode,@brndcode,@bag,@pck,@ipck,@wght,@qtyexe,@qtybal,@gn,@krate,@brate,@wq,@amt,@slbrkrt,@slbrktyp,@slbrkamt,@brbrkrt,@brbrktyp,@brbrkamt,@srno,@qltydet,@pckunit,@pcktype,@pckdet,@wghtunit,@rateper)	
	insert into sauda2(cont_sno,yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,sddate,p_code,typ,it_code,brnd_code,bag,pck,ipck,wght,qty_exe,qty_bal,g_n,k_rate,b_rate,w_q,amount,slbrk_rt,slbrk_typ,slbrk_amt,brbrk_rt,brbrk_typ,brbrk_amt,sr_no,qltydet,pckunit,pcktype,pckdet,wghtunit,rateper) 
	values                   (@vcd,@yr,@cocode,@mnbk,@cjsp,@vvcd,@voucchr,@sddate,@brcode,'BR',@itcode,@brndcode,@bag,@pck,@ipck,@wght,@qtyexe,@qtybal,@gn,@krate,@brate,@wq,@amt,@slbrkrt,@slbrktyp,@slbrkamt,@brbrkrt,@brbrktyp,@brbrkamt,@srno,@qltydet,@pckunit,@pcktype,@pckdet,@wghtunit,@rateper)	
	insert into sauda2(cont_sno,yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,sddate,p_code,typ,it_code,brnd_code,bag,pck,ipck,wght,qty_exe,qty_bal,g_n,k_rate,b_rate,w_q,amount,slbrk_rt,slbrk_typ,slbrk_amt,brbrk_rt,brbrk_typ,brbrk_amt,sr_no,qltydet,pckunit,pcktype,pckdet,wghtunit,rateper) 
	values                   (@vcd,@yr,@cocode,@mnbk,@cjsp,@vvcd,@voucchr,@sddate,@bbcode,'BB',@itcode,@brndcode,@bag,@pck,@ipck,@wght,@qtyexe,@qtybal,@gn,@krate,@brate,@wq,@amt,@slbrkrt,@slbrktyp,@slbrkamt,@brbrkrt,@brbrktyp,@brbrkamt,@srno,@qltydet,@pckunit,@pcktype,@pckdet,@wghtunit,@rateper)	

	 SET NOCOUNT ON 
	RETURN











set ANSI_NULLS ON
set QUOTED_IDENTIFIER ON





GO
/****** Object:  StoredProcedure [dbo].[AddSaudadocu]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS OFF
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[AddSaudadocu]
	(@sno int,@yr varchar(10),@cocode int, @mnbk varchar(5),@cjsp varchar(5),@vouccode int,@voucchr varchar(1),@narr varchar(250))	

AS	 
	if @sno >0 
	Begin
	        update saudadocu set narration = @narr where sno = @sno			
	End
	Else
	        insert into saudadocu(yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,narration) 
	        values                   (@yr,@cocode,@mnbk,@cjsp,@vouccode,@voucchr,@narr)	



	 SET NOCOUNT ON 
	RETURN




GO
/****** Object:  StoredProcedure [dbo].[AddSaudaspec]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO



CREATE PROCEDURE [dbo].[AddSaudaspec]
	(@sno int,@yr varchar(10),@cocode int, @mnbk varchar(5),@cjsp varchar(5),@vouccode int,@voucchr varchar(1),
	@spec_nm varchar(50) ,@spec_val money,@spec_minmax varchar(5),@spec_rmk varchar(100))
AS	 
	if @sno >0 
	Begin
	        update saudaspec set spec_nm = @spec_nm,spec_val = @spec_val,spec_minmax = @spec_minmax,spec_rmk = @spec_rmk where sno = @sno			
	End
	Else
	        insert into saudaspec(yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,spec_nm,spec_val,spec_minmax,spec_rmk) 
	        values    (@yr,@cocode,@mnbk,@cjsp,@vouccode,@voucchr,@spec_nm,@spec_val,@spec_minmax,@spec_rmk)	



	 SET NOCOUNT ON 
	RETURN


GO
/****** Object:  StoredProcedure [dbo].[AddSaudatrms]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS OFF
GO
SET QUOTED_IDENTIFIER OFF
GO


CREATE PROCEDURE [dbo].[AddSaudatrms]
	(@sno int,@yr varchar(10),@cocode int, @mnbk varchar(5),@cjsp varchar(5),@vouccode int,@voucchr varchar(1),@narr varchar(250))	

AS	 
	if @sno >0 
	Begin
	        update saudatrms set narration = @narr where sno = @sno			
	End
	Else
	        insert into saudatrms(yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,narration) 
	        values                   (@yr,@cocode,@mnbk,@cjsp,@vouccode,@voucchr,@narr)	



	 SET NOCOUNT ON 
	RETURN

GO
/****** Object:  StoredProcedure [dbo].[AddStatemst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO




CREATE PROCEDURE [dbo].[AddStatemst] 	
	(
	@acname varchar(50),@acstate varchar(50),@acarea money,@actv varchar(1)) 
	
AS	 
	insert into statemst (state_nm,state_cap,state_area,active) values (@acname,@acstate,@acarea,@actv) 

 SET NOCOUNT ON 
	RETURN


GO
/****** Object:  StoredProcedure [dbo].[AddStationmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS OFF
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[AddStationmst] 	
	(@acname varchar(50),@stcode int ,@dtcode int,@acstd varchar(20),@acpin varchar(6)) 
	
AS	 
	insert into stationmst (st_name,st_state,st_district,st_stdcd,st_pincode) values (@acname,@stcode,@dtcode,@acstd,@acpin) 

 SET NOCOUNT ON 
	RETURN

GO
/****** Object:  StoredProcedure [dbo].[AddTermmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS OFF
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[AddTermmst] 	
	(
	@acname varchar(40)) 
	
AS	 
	insert into termmst (term) values (@acname) 

 SET NOCOUNT ON 
	RETURN

GO
/****** Object:  StoredProcedure [dbo].[Addtrptmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO





CREATE PROCEDURE [dbo].[Addtrptmst] 	
	(
	@trname varchar(50),@tradd1 varchar(50),@tradd2 varchar(50),@trplace int,@trpin varchar(6),@trcont varchar(50),@trpho varchar(50),@trphr varchar(50),@trphm varchar(50),@trpan varchar(50),@tremail varchar(50)) 
	
AS	 
	insert into trptmst (tr_name,tr_add1,tr_add2,tr_place,tr_pin,tr_cont,tr_pho,tr_phr,tr_phm,tr_pan,tr_email) values (@trname,@tradd1,@tradd2,@trplace,@trpin,@trcont,@trpho,@trphr,@trphm,@trpan,@tremail) 
 SET NOCOUNT ON 
	RETURN


set ANSI_NULLS ON
set QUOTED_IDENTIFIER ON

GO
/****** Object:  StoredProcedure [dbo].[AddVehmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS OFF
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[AddVehmst] 	
	(
	@acname varchar(40),@wght money,@vehapprxwght varchar(50),@vehminapprx money,@vehmaxapprx money) 
	
AS	 
	insert into vehmst (veh_name,veh_wght,veh_apprxwght,veh_minapprx,veh_maxapprx) values (@acname,@wght,@vehapprxwght,@vehminapprx,@vehmaxapprx) 

 SET NOCOUNT ON 
	RETURN



set ANSI_NULLS OFF
set QUOTED_IDENTIFIER OFF



GO
/****** Object:  StoredProcedure [dbo].[EdtAcmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO







CREATE PROCEDURE [dbo].[EdtAcmst] 	
	(
	@mnbk varchar(2),@accode int, @acname varchar(50),@acadd1 varchar(50),@acadd2 varchar(50),@acplace int,@acpin varchar(6),@acsie varchar(1),@accont varchar(50),@acpho varchar(50),@acphr varchar(50),@acphm varchar(50),@actin varchar(50),@acpan varchar(50),@gsno int,@chrcode varchar(5),@opbal money,@opbaldc varchar(2),@opdt datetime,@billprty int,@acemail varchar(50),@db1nm varchar(50)) 
	
AS	 
	declare @sql varchar(250)	
	update accountmst set ac_name = @acname, ac_add1 = @acadd1,ac_add2 = @acadd2,ac_place = @acplace,
	ac_pin = @acpin,ac_sie = @acsie,ac_cont = @accont,ac_pho = @acpho,ac_phr = @acphr,ac_phm = @acphm,ac_tin = @actin,
	ac_pan = @acpan,g_sno = @gsno,chr_code = @chrcode,bill_prty = @billprty,ac_email = @acemail where sno = @accode
	declare @accd int
	select @accd = 0
	select @sql = 'select @accd = pcd from ' + @db1nm  + '.dbo.trans where main_bk = ''' +  @mnbk + ''' and c_j_S_p = ''' +  @mnbk + ''' and pcd = @accode'
	if @accd >0 
		select @sql =  'update ' + @db1nm  + '.dbo.trans set amount = ' + str(@opbal) +' ,d_c = ''' + @opbaldc + ''' where pcd = ' + str(@accd) + ' and main_bk =  ''' +  @mnbk + ''' and c_j_S_p = ''' +  @mnbk + ''''   
	else
	      if @opbal >0   		
			select @sql =  'insert into ' + @db1nm  + '.dbo.trans (main_bk,c_j_s_p,pcd,d_a_t_e,amount,d_c) values (''' +  @mnbk + ''',''' + @mnbk + ''',' + str(@accode) + ',''' +  convert(varchar(20), @opdt) + ''',' + str(@opbal) + ',''' + @opbaldc + ''')' 
	if @sql <> ''  EXEC (@sql) 
 SET NOCOUNT ON 
	RETURN




----------
set ANSI_NULLS ON
set QUOTED_IDENTIFIER ON


set ANSI_NULLS ON
set QUOTED_IDENTIFIER ON



set ANSI_NULLS ON
set QUOTED_IDENTIFIER ON

GO
/****** Object:  StoredProcedure [dbo].[EdtBankmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS OFF
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[EdtBankmst] 	
	(
	@bnkcode int, @bnkname varchar(100),@bnkbrnch varchar(50),@bnkifsc varchar(25),@bnkmicr varchar(50),@bnkadd varchar(200),@bnkadd1 varchar(100),@bnkcenter varchar(200),@bnkcont varchar(200),@bnkdist varchar(50),@stcode int) 	
AS	 
	update bankmst set bnk_name=@bnkname, bnk_brnch=@bnkbrnch, bnk_ifsc=@bnkifsc, bnk_micr=@bnkmicr, bnk_add=@bnkadd,bnk_add1=@bnkadd1, bnk_center=@bnkcenter, bnk_cont=@bnkcont, bnk_dist=@bnkdist, bnk_state=@stcode where sno = @bnkcode

 SET NOCOUNT ON 
	RETURN

GO
/****** Object:  StoredProcedure [dbo].[EdtCoumst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


CREATE PROCEDURE [dbo].[EdtCoumst] 	
	(
	@accode int, @acname varchar(50),@acadd1 varchar(50),@acadd2 varchar(50),@acplace int,@acpin varchar(6),@accont varchar(50),@acpho varchar(50),@acphr varchar(50),@acphm varchar(50),@actin varchar(50),@acpan varchar(50),@acemail varchar(50)) 
	
AS	 
	update coumst set ac_name = @acname, ac_add1 = @acadd1,ac_add2 = @acadd2,ac_place = @acplace
	,ac_pin = @acpin,ac_cont = @accont,ac_pho = @acpho,ac_phr = @acphr,ac_phm = @acphm,ac_tin = @actin,
	ac_pan = @acpan,ac_email = @acemail where sno = @accode

 SET NOCOUNT ON 
	RETURN



GO
/****** Object:  StoredProcedure [dbo].[EdtCustomermst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


CREATE PROCEDURE [dbo].[EdtCustomermst] 	
	(@bnkcode int, @custname varchar(50),@custplace varchar(50),@debac int) 	
AS	 
	update custmst set Cust_name=@custname, Cust_place=@custplace, deb_ac=@debac  where sno = @bnkcode

 SET NOCOUNT ON 
	RETURN


GO
/****** Object:  StoredProcedure [dbo].[EdtDDelivery]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO




CREATE PROCEDURE [dbo].[EdtDDelivery]
	(@sno int,@itsno int,@sddate datetime,
	@slcode int,@sbcode int,@brcode int,@bbcode int,@slcont varchar(50),@sbcont varchar(50),@brcont varchar(50),@bbcont varchar(50),
	@slbrok varchar(1),@sbbrok varchar(1),@brbrok varchar(1),@bbbrok varchar(1),@brok varchar(1), @pono varchar(50),@podate varchar(50), @bno varchar(50),@bdate varchar(50),
	@delvfr varchar(50),@delvto varchar(50),@term int,@fromct int , @toct int,@paycond varchar(1),@disccrdrt money,@form varchar(1),@rmks varchar(150),
	@itcode int,@brndcode int,@bag money,@pck money,@ipck varchar(25),@wght money,@qtyexe money,@qtybal money,@qtyrem money,@gn varchar(1),@krate money,@brate money,@wq varchar(1),
	@amt money,@slbrkrt money, @slbrktyp varchar(5),@slbrkamt money,@brbrkrt money, @brbrktyp varchar(5),@brbrkamt money,@cont2sno int,
	@billamt money,@motno varchar(35),@frght money,@frghtrt money,@frghtadv money,@add1rmk varchar(35),@add1amt money,@add2rmk varchar(35),@add2amt money,@add3rmk varchar(35),@add3amt money,
	@less1rmk varchar(35),@less1amt money,@less2rmk varchar(35),@less2amt money,@less3rmk varchar(35),@less3amt money,@bargamt money,@tptcode int )	
AS	 
	declare @vcd int,@contsno int
	select @vcd = 0
	declare @c2sno int,@srno int
	declare @c2yr varchar(10)
	declare @c2cocode int
	declare @c2mnbk varchar(5)
	declare @c2cjsp varchar(5)
	declare @c2vouccode int
	declare @c2srno int
	declare @c2voucchr varchar(1)
	declare @summ money,@qtyremtot money
	select @c2yr = yr from sauda2 where sno = @itsno
	select @c2cocode = cocode from sauda2 where sno = @itsno
	select @c2mnbk = main_bk from sauda2 where sno = @itsno
	select @c2cjsp =c_j_s_p from sauda2 where sno = @itsno
	select @c2vouccode = vouc_code from sauda2 where sno = @itsno
	select @c2srno = sr_no from sauda2 where sno = @itsno
	select @c2voucchr = vouc_chr from sauda2 where sno = @itsno
    /*UPDATE sauda2 SET sauda2.qty_exe = 0, sauda2.qty_bal = sauda2.wght */
	select @c2sno = 0
	declare @duedt datetime    
	declare @sdsno int	
	select @sdsno = 0
	if @sno > 0
	BEGIN
		update sauda1 set sd_date = @sddate,sl_code= @slcode,sb_code=@sbcode,br_code=@brcode,bb_code=@bbcode,sl_cont=@slcont,
			sb_cont=@sbcont,br_cont=@brcont,bb_cont=@bbcont,sl_brok=@slbrok,sb_brok=@sbbrok,br_brok=@brbrok,bb_brok=@bbbrok,
			brok_yn=@brok,pono=@pono,podt=@podate,bno = @bno,bdt=@bdate,delv_fr=@delvfr,delv_to=@delvto,term=@term,from_ct=@fromct,to_ct=@toct,paycond=@paycond,paydiscrt=@disccrdrt,cform=@form,rmks=@rmks,
			bill_amt=@billamt,mot_no=@motno,frght=@frght,frght_rt=@frghtrt,frght_adv=@frghtadv,add1_rmk=@add1rmk,add1_amt=@add1amt,
			add2_rmk=@add2rmk,add2_amt=@add2amt,add3_rmk=@add3rmk,add3_amt=@add3amt,less1_rmk=@less1rmk,less1_amt=@less1amt,less2_rmk=@less2rmk,
			less2_amt=@less2amt,less3_rmk=@less3rmk,less3_amt=@less3amt,barg_amt = @bargamt,tptcode =@tptcode where sno = @sno

		select @duedt = dateadd(d,@disccrdrt,@sddate) where @paycond = 'C'
		select @duedt = @sddate where  @paycond = 'D'

		update outstanding set sd_date= @sddate,sl_code =@slcode,sb_code = @sbcode,br_code = @brcode,bb_code = @bbcode,pono = @bno,podt = @bdate,term = @term,paycond = @paycond,paydiscrt = @disccrdrt,bill_amt = @billamt,Outs_amt = @bargamt,outs_bal = Outs_amt-Outs_rec-Outs_exp-Outs_clr,due_date=@duedt
		where yr = @c2yr and cocode =@c2cocode and main_bk = @c2mnbk and c_j_s_p = @c2cjsp and vouc_code = @c2vouccode and vouc_chr = @c2voucchr
	END

	if @itsno>0
	Begin
		select @contsno = cont_sno,@srno = sr_no from sauda2 where sno = @itsno 
		update sauda2 set p_code = @slcode, sddate = @sddate,it_code = @itcode,brnd_code = @brndcode,bag=@bag,pck=@pck,ipck =@ipck,wght=@wght,
		g_n=@gn,k_rate = @krate,b_rate=@brate,w_q=@wq,amount=@amt,slbrk_rt=@slbrkrt,slbrk_typ=@slbrktyp,slbrk_amt=@slbrkamt,
		brbrk_rt=@brbrkrt,brbrk_typ=@brbrktyp,brbrk_amt=@brbrkamt,qty_rem = @qtyrem where typ = 'SL' and sr_no = @srno and cont_sno = @contsno


		update sauda2 set p_code = @slcode, sddate = @sddate,it_code = @itcode,brnd_code = @brndcode,bag=@bag,pck=@pck,ipck =@ipck,wght=@wght,
		g_n=@gn,k_rate = @krate,b_rate=@brate,w_q=@wq,amount=@amt,slbrk_rt=@slbrkrt,slbrk_typ=@slbrktyp,slbrk_amt=@slbrkamt,
		brbrk_rt=@brbrkrt,brbrk_typ=@brbrktyp,brbrk_amt=@brbrkamt,qty_rem = @qtyrem where typ = 'BR' and sr_no = @srno and cont_sno = @contsno


	
	END

	 SET NOCOUNT ON 
	RETURN



set ANSI_NULLS ON
set QUOTED_IDENTIFIER ON





GO
/****** Object:  StoredProcedure [dbo].[EdtDelivery]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


CREATE PROCEDURE [dbo].[EdtDelivery]
	(@sno int,@itsno int,@sddate datetime,@bltype varchar(1),
	@slcode int,@sbcode int,@brcode int,@bbcode int,@slcont varchar(50),@sbcont varchar(50),@brcont varchar(50),@bbcont varchar(50),
	@slbrok varchar(1),@sbbrok varchar(1),@brbrok varchar(1),@bbbrok varchar(1),@brok varchar(1), @pono varchar(50),@podate varchar(50),
	@delvfr varchar(50),@delvto varchar(50),@term int,@fromct int , @toct int,@paycond varchar(1),@disccrdrt money,@form varchar(1),@rmks varchar(150),
	@itcode int,@brndcode int,@bag money,@pck money,@ipck varchar(25),@wght money,@qtyexe money,@qtybal money,@qtyrem money,@gn varchar(1),@krate money,@brate money,@wq varchar(1),
	@amt money,@slbrkrt money, @slbrktyp varchar(5),@slbrkamt money,@brbrkrt money, @brbrktyp varchar(5),@brbrkamt money,@cont2sno int,
	@billamt money,@motno varchar(35),@frght money,@frghtrt money,@frghtadv money,@add1rmk varchar(35),@add1amt money,@add2rmk varchar(35),@add2amt money,@add3rmk varchar(35),@add3amt money,
	@less1rmk varchar(35),@less1amt money,@less2rmk varchar(35),@less2amt money,@less3rmk varchar(35),@less3amt money,@bargamt money,@tptcode int ,@tptcol money,@rateper money)	
AS	 
	declare @vcd int,@contsno int
	select @vcd = 0
	declare @c2sno int,@srno int
	declare @c2yr varchar(10)
	declare @c2cocode int
	declare @c2mnbk varchar(5)
	declare @c2cjsp varchar(5)
	declare @c2vouccode int
	declare @c2srno int
	declare @c2voucchr varchar(1)
	declare @summ money,@qtyremtot money
	select @c2yr = yr from sauda2 where sno = @cont2sno
	select @c2cocode = cocode from sauda2 where sno = @cont2sno
	select @c2mnbk = main_bk from sauda2 where sno = @cont2sno
	select @c2cjsp =c_j_s_p from sauda2 where sno = @cont2sno
	select @c2vouccode = vouc_code from sauda2 where sno = @cont2sno
	select @c2srno = sr_no from sauda2 where sno = @cont2sno
	select @c2voucchr = vouc_chr from sauda2 where sno = @cont2sno
    /*UPDATE sauda2 SET sauda2.qty_exe = 0, sauda2.qty_bal = sauda2.wght */
	declare @sdyr varchar(10)
	declare @sdcocode int
	declare @sdmnbk varchar(5)
	declare @sdcjsp varchar(5)
	declare @sdvouccode int
	declare @sdvoucchr varchar(1)
	select @sdyr = yr from sauda2 where sno = @itsno
	select @sdcocode = cocode from sauda2 where sno = @itsno
	select @sdmnbk = main_bk from sauda2 where sno = @itsno
	select @sdcjsp =c_j_s_p from sauda2 where sno = @itsno
	select @sdvouccode = vouc_code from sauda2 where sno = @itsno
	select @sdvoucchr = vouc_chr from sauda2 where sno = @itsno

	select @c2sno = 0
	declare @duedt datetime    
	declare @sdsno int	
	select @sdsno = 0
	if @sno > 0
	BEGIN
		update sauda1 set sd_date = @sddate,sl_code= @slcode,sb_code=@sbcode,br_code=@brcode,bb_code=@bbcode,sl_cont=@slcont,
			sb_cont=@sbcont,br_cont=@brcont,bb_cont=@bbcont,sl_brok=@slbrok,sb_brok=@sbbrok,br_brok=@brbrok,bb_brok=@bbbrok,
			brok_yn=@brok,pono=@pono,podt=@podate,delv_fr=@delvfr,delv_to=@delvto,term=@term,from_ct=@fromct,to_ct=@toct,paycond=@paycond,paydiscrt=@disccrdrt,cform=@form,rmks=@rmks,
			bill_amt=@billamt,mot_no=@motno,frght=@frght,frght_rt=@frghtrt,frght_adv=@frghtadv,add1_rmk=@add1rmk,add1_amt=@add1amt,
			add2_rmk=@add2rmk,add2_amt=@add2amt,add3_rmk=@add3rmk,add3_amt=@add3amt,less1_rmk=@less1rmk,less1_amt=@less1amt,less2_rmk=@less2rmk,
			less2_amt=@less2amt,less3_rmk=@less3rmk,less3_amt=@less3amt,barg_amt = @bargamt,tptcode =@tptcode where sno = @sno

		select @duedt = dateadd(d,@disccrdrt,@sddate) where @paycond = 'C'
		select @duedt = @sddate where  @paycond = 'D'

		update outstanding set sd_date= @sddate,sl_code =@slcode,sb_code = @sbcode,br_code = @brcode,bb_code = @bbcode,pono = @pono,podt = @podate,term = @term,paycond = @paycond,paydiscrt = @disccrdrt,bill_amt = @billamt,Outs_amt = @bargamt,outs_bal = Outs_amt-Outs_rec-Outs_exp-Outs_clr,due_date=@duedt
		where yr = @sdyr and cocode =@sdcocode and main_bk = @sdmnbk and c_j_s_p = @sdcjsp and vouc_code = @sdvouccode and vouc_chr = @sdvoucchr
	END

	if @itsno>0
	Begin
		select @contsno = cont_sno,@srno = sr_no from sauda2 where sno = @itsno 
		select @c2sno = sno from sauda2 where yr = @c2yr and cocode = @c2cocode and main_bk = @c2mnbk AND c_j_s_p = @c2cjsp and   vouc_code =  @c2vouccode and vouc_chr = @c2voucchr and sr_no = @c2srno and typ = 'SL'	


		update sauda2 set p_code = @slcode, sddate = @sddate,it_code = @itcode,brnd_code = @brndcode,bag=@bag,pck=@pck,qltydet =@ipck,wght=@wght,
		g_n=@gn,k_rate = @krate,b_rate=@brate,w_q=@wq,amount=@amt,slbrk_rt=@slbrkrt,slbrk_typ=@slbrktyp,slbrk_amt=@slbrkamt,
		brbrk_rt=@brbrkrt,brbrk_typ=@brbrktyp,brbrk_amt=@brbrkamt,qty_rem = @qtyrem,rateper = @rateper where typ = 'SL' and sr_no = @srno and cont_sno = @contsno

		select @summ = 0,@qtyremtot =0
		if @bltype = 'W' 
			Begin
				select @summ = sum(sauda2.wght),@qtyremtot =sum(sauda2.qty_rem) from  sauda2 where sauda2.cont2_sno = @c2sno group by sauda2.cont2_sno		
				UPDATE sauda2 SET sauda2.qty_exe = @summ,sauda2.qty_rem = @qtyremtot ,sauda2.qty_bal = sauda2.wght -@summ-@qtyremtot fROM sauda2 where sauda2.sno = @c2sno and main_bk = 'SD'
			end
		else
			if @bltype = 'V' 
				Begin
					select @summ = sum(sauda2.rateper),@qtyremtot =sum(sauda2.qty_rem) from  sauda2 where sauda2.cont2_sno = @c2sno group by sauda2.cont2_sno		
					UPDATE sauda2 SET sauda2.qty_exe = @summ,sauda2.qty_rem = @qtyremtot ,sauda2.qty_bal = sauda2.rateper -@summ-@qtyremtot fROM sauda2 where sauda2.sno = @c2sno and main_bk = 'SD'
				end
			else
				Begin
					select @summ = sum(sauda2.bag),@qtyremtot =sum(sauda2.qty_rem)  from  sauda2 where sauda2.cont2_sno = @c2sno group by sauda2.cont2_sno	
					UPDATE sauda2 SET sauda2.qty_exe = @summ,sauda2.qty_rem = @qtyremtot ,sauda2.qty_bal = sauda2.bag -@summ-@qtyremtot fROM sauda2 where sauda2.sno = @c2sno and main_bk = 'SD'
				end
--cont2_sno = @c2sno and 
		select @c2sno = sno from sauda2 where yr =  @c2yr and cocode = @c2cocode and main_bk = @c2mnbk AND c_j_s_p = @c2cjsp and   vouc_code =  @c2vouccode and vouc_chr = @c2voucchr and sr_no = @c2srno and typ = 'SB'	
		update sauda2 set p_code = @slcode, sddate = @sddate,it_code = @itcode,brnd_code = @brndcode,bag=@bag,pck=@pck,qltydet =@ipck,wght=@wght,
		g_n=@gn,k_rate = @krate,b_rate=@brate,w_q=@wq,amount=@amt,slbrk_rt=@slbrkrt,slbrk_typ=@slbrktyp,slbrk_amt=@slbrkamt,
		brbrk_rt=@brbrkrt,brbrk_typ=@brbrktyp,brbrk_amt=@brbrkamt,qty_rem = @qtyrem,rateper = @rateper where typ = 'SB' and sr_no = @srno and cont_sno = @contsno
		select @summ = 0,@qtyremtot =0

		if @bltype = 'W' 
			Begin
				select @summ = sum(sauda2.wght),@qtyremtot =sum(sauda2.qty_rem) from  sauda2 where sauda2.cont2_sno = @c2sno group by sauda2.cont2_sno		
				UPDATE sauda2 SET sauda2.qty_exe = @summ,sauda2.qty_rem = @qtyremtot ,sauda2.qty_bal = sauda2.wght -@summ-@qtyremtot fROM sauda2 where sauda2.sno = @c2sno and main_bk = 'SD'
			end
		else
			if @bltype = 'V' 
				Begin
					select @summ = sum(sauda2.rateper),@qtyremtot =sum(sauda2.qty_rem) from  sauda2 where sauda2.cont2_sno = @c2sno group by sauda2.cont2_sno		
					UPDATE sauda2 SET sauda2.qty_exe = @summ,sauda2.qty_rem = @qtyremtot ,sauda2.qty_bal = sauda2.rateper -@summ-@qtyremtot fROM sauda2 where sauda2.sno = @c2sno and main_bk = 'SD'
				end
			else
				Begin
					select @summ = sum(sauda2.bag),@qtyremtot =sum(sauda2.qty_rem)  from  sauda2 where sauda2.cont2_sno = @c2sno group by sauda2.cont2_sno	
					UPDATE sauda2 SET sauda2.qty_exe = @summ,sauda2.qty_rem = @qtyremtot ,sauda2.qty_bal = sauda2.bag -@summ-@qtyremtot fROM sauda2 where sauda2.sno = @c2sno and main_bk = 'SD'
				end

		select @c2sno = sno from sauda2 where  yr =  @c2yr and cocode = @c2cocode and main_bk = @c2mnbk AND c_j_s_p = @c2cjsp and   vouc_code =  @c2vouccode and vouc_chr = @c2voucchr and sr_no = @c2srno and typ = 'BR'	
		update sauda2 set p_code = @slcode, sddate = @sddate,it_code = @itcode,brnd_code = @brndcode,bag=@bag,pck=@pck,qltydet =@ipck,wght=@wght,
		g_n=@gn,k_rate = @krate,b_rate=@brate,w_q=@wq,amount=@amt,slbrk_rt=@slbrkrt,slbrk_typ=@slbrktyp,slbrk_amt=@slbrkamt,
		brbrk_rt=@brbrkrt,brbrk_typ=@brbrktyp,brbrk_amt=@brbrkamt,qty_rem = @qtyrem,rateper = @rateper where typ = 'BR' and sr_no = @srno and cont_sno = @contsno
		select @summ = 0,@qtyremtot =0

		if @bltype = 'W' 
			Begin
				select @summ = sum(sauda2.wght),@qtyremtot =sum(sauda2.qty_rem) from  sauda2 where sauda2.cont2_sno = @c2sno group by sauda2.cont2_sno		
				UPDATE sauda2 SET sauda2.qty_exe = @summ,sauda2.qty_rem = @qtyremtot ,sauda2.qty_bal = sauda2.wght -@summ-@qtyremtot fROM sauda2 where sauda2.sno = @c2sno and main_bk = 'SD'
			end
		else
			if @bltype = 'V' 
				Begin
					select @summ = sum(sauda2.rateper),@qtyremtot =sum(sauda2.qty_rem) from  sauda2 where sauda2.cont2_sno = @c2sno group by sauda2.cont2_sno		
					UPDATE sauda2 SET sauda2.qty_exe = @summ,sauda2.qty_rem = @qtyremtot ,sauda2.qty_bal = sauda2.rateper -@summ-@qtyremtot fROM sauda2 where sauda2.sno = @c2sno and main_bk = 'SD'
				end
			else
				Begin
					select @summ = sum(sauda2.bag),@qtyremtot =sum(sauda2.qty_rem)  from  sauda2 where sauda2.cont2_sno = @c2sno group by sauda2.cont2_sno	
					UPDATE sauda2 SET sauda2.qty_exe = @summ,sauda2.qty_rem = @qtyremtot ,sauda2.qty_bal = sauda2.bag -@summ-@qtyremtot fROM sauda2 where sauda2.sno = @c2sno and main_bk = 'SD'
				end

		select @c2sno = sno from sauda2 where yr =  @c2yr and cocode = @c2cocode and main_bk = @c2mnbk AND c_j_s_p = @c2cjsp and   vouc_code =  @c2vouccode and vouc_chr = @c2voucchr and sr_no = @c2srno and typ = 'BB'	
		update sauda2 set p_code = @slcode, sddate = @sddate,it_code = @itcode,brnd_code = @brndcode,bag=@bag,pck=@pck,qltydet =@ipck,wght=@wght,
		g_n=@gn,k_rate = @krate,b_rate=@brate,w_q=@wq,amount=@amt,slbrk_rt=@slbrkrt,slbrk_typ=@slbrktyp,slbrk_amt=@slbrkamt,
		brbrk_rt=@brbrkrt,brbrk_typ=@brbrktyp,brbrk_amt=@brbrkamt,qty_rem = @qtyrem,rateper = @rateper where typ = 'BB' and sr_no = @srno and cont_sno = @contsno
		select @summ = 0,@qtyremtot =0

		if @bltype = 'W' 
			Begin
				select @summ = sum(sauda2.wght),@qtyremtot =sum(sauda2.qty_rem) from  sauda2 where sauda2.cont2_sno = @c2sno group by sauda2.cont2_sno		
				UPDATE sauda2 SET sauda2.qty_exe = @summ,sauda2.qty_rem = @qtyremtot ,sauda2.qty_bal = sauda2.wght -@summ-@qtyremtot fROM sauda2 where sauda2.sno = @c2sno and main_bk = 'SD'
			end
		else
			if @bltype = 'V' 
				Begin
					select @summ = sum(sauda2.rateper),@qtyremtot =sum(sauda2.qty_rem) from  sauda2 where sauda2.cont2_sno = @c2sno group by sauda2.cont2_sno		
					UPDATE sauda2 SET sauda2.qty_exe = @summ,sauda2.qty_rem = @qtyremtot ,sauda2.qty_bal = sauda2.rateper -@summ-@qtyremtot fROM sauda2 where sauda2.sno = @c2sno and main_bk = 'SD'
				end
			else
				Begin
					select @summ = sum(sauda2.bag),@qtyremtot =sum(sauda2.qty_rem)  from  sauda2 where sauda2.cont2_sno = @c2sno group by sauda2.cont2_sno	
					UPDATE sauda2 SET sauda2.qty_exe = @summ,sauda2.qty_rem = @qtyremtot ,sauda2.qty_bal = sauda2.bag -@summ-@qtyremtot fROM sauda2 where sauda2.sno = @c2sno and main_bk = 'SD'
				end
	
	END

	 SET NOCOUNT ON 
	RETURN



set ANSI_NULLS ON
set QUOTED_IDENTIFIER ON









GO
/****** Object:  StoredProcedure [dbo].[EdtDistmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS OFF
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[EdtDistmst] 	
	(
	@accode int, @acname varchar(50),@stcode int,@acarea money,@acpop money) 	
AS	 
	update distmst set dist_nm = @acname,state_cd = @stcode,dist_area=@acarea ,dist_pop = @acpop where sno = @accode

 SET NOCOUNT ON 
	RETURN

GO
/****** Object:  StoredProcedure [dbo].[EdtExpmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO



CREATE PROCEDURE [dbo].[EdtExpmst] 	
	(
	@accode int, @acname varchar(50),@actype varchar(2)) 	
AS	 
	update expmst set expnm = @acname,type = @actype where sno = @accode

 SET NOCOUNT ON 
	RETURN



GO
/****** Object:  StoredProcedure [dbo].[EdtItemspec]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [dbo].[EdtItemspec]
	(
	@itemsno int ,@itemstpsno int,@spec_nm varchar(50),@spec_val money,@spec_minmax varchar(5),@spec_rmk varchar(100))
AS	 
UPDATE [brokermast].[dbo].[itemspec]
   SET [itm_sno] = @itemstpsno,[spec_nm] = @spec_nm,[spec_val] = @spec_val,[spec_minmax] = @spec_minmax
      ,[spec_rmk] = @spec_rmk
 WHERE sno = @itemsno 
 SET NOCOUNT ON 
	RETURN




GO
/****** Object:  StoredProcedure [dbo].[EdtLclDalali]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO



CREATE PROCEDURE [dbo].[EdtLclDalali]
	
	(@sno int,@itsno int,@sddate datetime,@slcode int,@brcode int,@brcont varchar(50),@rmks varchar(150),
	@itcode int,@brndcode int,@bag money,@pck money,@ipck varchar(25),@wght money,@qtyexe money,@qtybal money,@gn varchar(1),@krate money,@brate money,@wq varchar(1),
	@amt money,@slbrkrt money, @slbrktyp varchar(5),@slbrkamt money,@brbrkrt money, @brbrktyp varchar(5),@brbrkamt money,@cont2sno int,
	@motno varchar(35),@add1rmk varchar(35),@add1amt money,@add2rmk varchar(35),@add2amt money,@add3rmk varchar(35),@add3amt money,
	@less1rmk varchar(35),@less1amt money,@less2rmk varchar(35),@less2amt money,@less3rmk varchar(35),@less3amt money )	
AS	 
	declare @vvcd int
	declare @vcd int
	select @vcd = 0
	declare @sdsno int	
	select @sdsno = 0
	declare @contsno int
	select @contsno	= 0
	declare @srno int
	select @srno = 0

	if @sno > 0
	BEGIN
		update sauda1 set sd_date = @sddate ,br_code = @brcode,br_cont = @brcont,mot_no = @motno,add1_rmk =@add1rmk,
			add1_amt = @add1amt,add2_rmk = @add2rmk,add2_amt = @add2amt,add3_rmk = @add3rmk,add3_amt = @add3amt,
			less1_rmk = @less1rmk,less1_amt = @less1amt,less2_rmk = @less2rmk,less2_amt = @less2amt,less3_rmk = @less3rmk,less3_amt = @less3amt,rmks = @rmks where sno = @sno
	end
	if @itsno>0
	Begin
		select @contsno = cont_sno,@srno = sr_no from sauda2 where sno = @itsno 

		update sauda2 set sddate = @sddate,p_code = @slcode ,op_code = @brcode,it_code = @itcode,brnd_code = @brndcode,bag = @bag,
		pck=@pck,ipck=@ipck,wght=@wght,qty_exe=@qtyexe,qty_bal =@qtybal,g_n = @gn,k_rate =@krate,b_rate = @brate,w_q=@wq,
		amount =@amt,slbrk_rt = @slbrkrt,slbrk_typ =@slbrktyp,slbrk_amt= @slbrkamt,brbrk_rt = @brbrkrt,brbrk_typ =@brbrktyp,brbrk_amt =@brbrkamt where typ = 'SL' and sr_no = @srno and cont_sno = @contsno
	
		update sauda2 set sddate = @sddate,p_code = @slcode ,op_code = @brcode,it_code = @itcode,brnd_code = @brndcode,bag = @bag,
		pck=@pck,ipck=@ipck,wght=@wght,qty_exe=@qtyexe,qty_bal =@qtybal,g_n = @gn,k_rate =@krate,b_rate = @brate,w_q=@wq,
		amount =@amt,slbrk_rt = @slbrkrt,slbrk_typ =@slbrktyp,slbrk_amt= @slbrkamt,brbrk_rt = @brbrkrt,brbrk_typ =@brbrktyp,brbrk_amt =@brbrkamt where typ = 'BR' and sr_no = @srno and cont_sno = @contsno
	END 

	 SET NOCOUNT ON 
	RETURN


GO
/****** Object:  StoredProcedure [dbo].[EdtNarrmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS OFF
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[EdtNarrmst] 	
	(
	@accode int, @acname varchar(250),@actype varchar(25)) 	
AS	 
	update narrmst set narration = @acname,type = @actype where sno = @accode

 SET NOCOUNT ON 
	RETURN

GO
/****** Object:  StoredProcedure [dbo].[EdtOrder]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO



CREATE PROCEDURE [dbo].[EdtOrder]
	
	(@sno int,@itsno int,@sddate datetime,@slcode int,@sbcode int,@brcode int,@bbcode int,@slcont varchar(50),@sbcont varchar(50),@brcont varchar(50),@bbcont varchar(50),
	@pono varchar(50),@podate varchar(50),@delvfr varchar(50),@delvto varchar(50),@term int,@fromct int , @toct int,@paycond varchar(1),@disccrdrt money,@form varchar(1),@rmks varchar(150),
	@itcode int,@brndcode int,@bag money,@pck money,@ipck varchar(25),@wght money,@qtyexe money,@qtybal money,@gn varchar(1),@krate money,@brate money,@wq varchar(1),@amt money)	
AS	 
	declare @vvcd int
	declare @vcd int
	select @vcd = 0
	declare @sdsno int	
	select @sdsno = 0
	declare @contsno int
	select @contsno	= 0
	declare @srno int
	select @srno = 0

	if @sno > 0
	BEGIN
		update sauda1 set sd_date = @sddate,sl_code= @slcode,sb_code=@sbcode,br_code=@brcode,bb_code=@bbcode,sl_cont=@slcont,
			sb_cont=@sbcont,br_cont=@brcont,bb_cont=@bbcont,pono=@pono,podt=@podate,delv_fr=@delvfr,delv_to=@delvto,term=@term,
			from_ct=@fromct,to_ct=@toct,paycond=@paycond,paydiscrt=@disccrdrt,cform=@form,rmks=@rmks where sno = @sno
	end
	if @itsno>0
	Begin
		select @contsno = cont_sno,@srno = sr_no from sauda2 where sno = @itsno 
	
		update sauda2 set sddate = @sddate,it_code = @itcode,brnd_code = @brndcode,bag=@bag,pck=@pck,ipck =@ipck,wght=@wght,
		g_n=@gn,k_rate = @krate,b_rate=@brate,w_q=@wq,amount=@amt where typ = 'SL' and sr_no = @srno and cont_sno = @contsno
	
		update sauda2 set sddate = @sddate,it_code = @itcode,brnd_code = @brndcode,bag=@bag,pck=@pck,ipck =@ipck,wght=@wght,
		g_n=@gn,k_rate = @krate,b_rate=@brate,w_q=@wq,amount=@amt where typ = 'SB' and sr_no = @srno and cont_sno = @contsno
		
		update sauda2 set sddate = @sddate,it_code = @itcode,brnd_code = @brndcode,bag=@bag,pck=@pck,ipck =@ipck,wght=@wght,
		g_n=@gn,k_rate = @krate,b_rate=@brate,w_q=@wq,amount=@amt where typ = 'BR' and sr_no = @srno and cont_sno = @contsno
	
		update sauda2 set sddate = @sddate,it_code = @itcode,brnd_code = @brndcode,bag=@bag,pck=@pck,ipck =@ipck,wght=@wght,
		g_n=@gn,k_rate = @krate,b_rate=@brate,w_q=@wq,amount=@amt where typ = 'BB' and sr_no = @srno and cont_sno = @contsno

	END 

	 SET NOCOUNT ON 
	RETURN





GO
/****** Object:  StoredProcedure [dbo].[EdtPaydet]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[EdtPaydet]
	(@sno int,@sddate datetime,@expcode int,@exprate money,@expamt money)	
AS	 
	
	declare @sdsno int	
	select @sdsno = 0		

	update outsdet set sd_date= @sddate,exp_code = @expcode,exp_rate = @exprate,exp_amt =@expamt where sno = @sno
	
	 SET NOCOUNT ON 
	RETURN







set ANSI_NULLS ON
set QUOTED_IDENTIFIER ON
GO
/****** Object:  StoredProcedure [dbo].[EdtPayment]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


CREATE PROCEDURE [dbo].[EdtPayment]
	(@sno int,@sddate datetime,	@slcode int,@brcode int,@chkddtyp varchar(20),@chkddno varchar(40),@chkdddt datetime,@chkddamt money,@adjsno int,
    @dep_bnk int,@dep_ac char(100),@courier int,@cou_rec char(25),@cou_chgs money,@rmks1 char(150),@rmks2 char(150),
	@adjamt money,@adjexpamt money)	
AS	 
	declare @vvcd int
	declare @vcd int
	select @vcd = 0

	declare @recamt money,@bargamt money,@expamt money,@clramt money

	if @sno >0 
	begin	
		update payment set pay_date = @sddate ,sl_code = @slcode,br_code = @brcode,chkddtyp = @chkddtyp,chkddno = @chkddno,chkdddt=@chkdddt,
		chkddamt=@chkddamt,dep_bnk=@dep_bnk,dep_ac=@dep_ac,courier=@courier,cou_rec=@cou_rec,cou_chgs=@cou_chgs,rmks1=@rmks1,rmks2=@rmks2 where sno = @sno
	end


	declare @adjyr varchar(10)
	declare @adjcocode int
	declare @adjmnbk varchar(5)
	declare @adjcjsp varchar(5) 
	declare @adjvouccode int
	declare @adjvoucchr varchar(1)       
	declare @adjsbcode int
	declare @adjbbcode int
	declare @adjpono varchar(50)       
	declare @adjpodt varchar(10)       
	
	select @adjyr = yr from outstanding where sno = @adjsno
	select @adjcocode = cocode from outstanding where sno = @adjsno
	select @adjmnbk = main_bk from outstanding where sno = @adjsno
	select @adjcjsp =c_j_s_p from outstanding where sno = @adjsno
	select @adjvouccode = vouc_code from outstanding where sno = @adjsno
	select @adjvoucchr = vouc_chr from outstanding where sno = @adjsno
	select @adjsbcode = sb_code from outstanding where sno = @adjsno
	select @adjbbcode = bb_code from outstanding where sno = @adjsno
	select @adjpono = pono from outstanding where sno = @adjsno
	select @adjpodt = podt from outstanding where sno = @adjsno



	declare @payyr varchar(10)
	declare @paycocode int
	declare @paymnbk varchar(5)
	declare @paycjsp varchar(5) 
	declare @payvouccode int
	declare @payvoucchr varchar(1)       
	
	select @payyr = yr from payment where sno = @sno
	select @paycocode = cocode from payment where sno = @sno
	select @paymnbk = main_bk from payment where sno = @sno
	select @paycjsp =c_j_s_p from payment where sno = @sno
	select @payvouccode = vouc_code from payment where sno = @sno
	select @payvoucchr = vouc_chr from payment where sno = @sno
	
	update outstanding set sd_date = @sddate,sl_code = @slcode,sb_code=@adjsbcode ,br_code=@brcode ,bb_code = @adjbbcode,pono = @adjpono,podt = @adjpodt,Outs_amt= @adjamt,Outs_exp=@adjexpamt,Outs_clr=0 ,Outs_bal=0
		where  yr = @payyr and cocode = @paycocode and main_bk = @paymnbk and c_j_s_p = @paycjsp and vouc_code =@payvouccode and vouc_chr = @payvoucchr and adj_yr = @adjyr and adj_cocode = @adjcocode and adj_main_bk =@adjmnbk and adj_c_j_s_p = @adjcjsp and adj_vouc_code =@adjvouccode and adj_vouc_chr =@adjvoucchr


	select @bargamt= sauda1.barg_amt from  sauda1 where (sauda1.yr = @adjyr) and (sauda1.cocode = @adjcocode) and (sauda1.main_bk = @adjmnbk) and (sauda1.c_j_s_p = @adjcjsp) and (sauda1.vouc_code = @adjvouccode) and (sauda1.vouc_chr = @adjvoucchr) 

	select @recamt=0,@expamt=0,@clramt=0
	select @recamt= sum(outstanding.outs_amt),@expamt= sum(outstanding.outs_exp),@clramt= sum(outstanding.outs_clr) from  outstanding where outstanding.adj_yr = @adjyr and outstanding.adj_cocode = @adjcocode and outstanding.adj_main_bk = @adjmnbk and outstanding.adj_c_j_s_p = @adjcjsp and outstanding.adj_vouc_code = @adjvouccode and outstanding.adj_vouc_chr = @adjvoucchr and  outstanding.main_bk = 'PAY' group by outstanding.adj_yr,outstanding.adj_cocode,outstanding.adj_main_bk,outstanding.adj_c_j_s_p,outstanding.adj_vouc_code,outstanding.adj_vouc_chr

	UPDATE outstanding
	SET outstanding.outs_amt = @bargamt,outstanding.outs_rec = @recamt,outstanding.outs_exp = @expamt,outstanding.outs_clr = @clramt,outstanding.outs_bal = @bargamt- @recamt-@expamt-@clramt
	fROM outstanding where outstanding.sno = @adjsno


	 SET NOCOUNT ON 
	RETURN








GO
/****** Object:  StoredProcedure [dbo].[EdtPmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[EdtPmst] 	
	(
	@acname varchar(50), @accode int , @acptype varchar(10),@acadd1 varchar(50),@acadd2 varchar(50),@acareanm varchar(40),@acplace int,@acpin varchar(6) ,
	@acsie varchar(1),@accont varchar(50),@acpho varchar(50),@acphr varchar(50),@acphm varchar(50),@actin varchar(50),
	@acpan varchar(50),@gsno int,@chrcode varchar(150),@opbal money,@opbaldc varchar(2),@opdt datetime,@billprty int,@acemail varchar(50),
	@acpho1 varchar(25),@acvat varchar(50),@acpho2 varchar(25),@acpho3 varchar(25),@acphr1 varchar(25),@acphm1 varchar(25),@ac_gstin varchar(50),
	@accont1 varchar(50),@acgrp varchar(25),@acdelvnm varchar(50),@acdelvadd1 varchar(50),@acdelvadd2 varchar(50),@acdelvplace int,
	@acdelvpin varchar(6),@acdelvsie varchar(1),@acdelvtin varchar(50),@acdelvpan varchar(50),@acdelvvat varchar(50),@acdelvpho1 varchar(25),
	@acdelvpho2 varchar(25),@acdelvphm1 varchar(25),@acdelvphm2 varchar(25),@acbnkac1 varchar(25),@acbnkac2 varchar(25),@aclimit money,
	@acbnkac3 varchar(25),@acbnk1 int,@acbnk2 int,@acbnk3 int,@acemail1 varchar(50),@acweb varchar(50),@accate varchar(1),
	@acwork varchar(1),@acmail varchar(50),@hopbal money,@hopbaldc varchar(2),@hopdt datetime,@acemail2 varchar(50),@acemail3 varchar(50),
	@accont2 varchar(50),@accont3 varchar(50),@accontfrm1 varchar(25),@accontfrm2 varchar(25),@accontfrm3 varchar(25),@accontfrm4 varchar(25),@acssevausr varchar(50),@acssevapwd varchar(10) ) 
	
AS	 
	update accountmst set ac_name= @acname,ac_add1 = @acadd1 ,ac_add2 = @acadd2,ac_area=@acareanm ,ac_place=@acplace,ac_pin=@acpin,ac_sie=@acsie,
			ac_cont=@accont,ac_pho=@acpho,ac_phr=@acphr,ac_phm=@acphm,ac_tin=@actin,ac_pan=@acpan,g_sno=@gsno,rmk=@chrcode,ac_gstin=@ac_gstin,
		    bill_prty=@billprty,ac_email=@acemail,ac_pho1=@acpho1,ac_vat=@acvat,ac_pho2=@acpho2,ac_pho3=@acpho3,ac_phr1=@acphr1,
		ac_phm1=@acphm1,ac_cont1=@accont1,ac_grp=@acgrp,ac_delvnm=@acdelvnm,ac_delvadd1=@acdelvadd1,ac_delvadd2=@acdelvadd2,
		ac_delvplace=@acdelvplace,ac_delvpin=@acdelvpin,ac_delvsie=@acdelvsie,ac_delvtin=@acdelvtin,ac_delvpan=@acdelvpan,ac_delvvat=@acdelvvat,
		ac_delvpho1=@acdelvpho1,ac_delvpho2=@acdelvpho2,ac_delvphm1=@acdelvphm1,ac_delvphm2=@acdelvphm2,ac_bnkac1=@acbnkac1,
		ac_bnkac2=@acbnkac2,ac_bnkac3=@acbnkac3,ac_bnk1=@acbnk1,ac_bnk2=@acbnk2,ac_bnk3=@acbnk3,ac_email1=@acemail1,ac_web=@acweb,
		ac_cate=@accate,ac_work=@acwork,ac_mail=@acmail,p_type = @acptype,ac_email2 = @acemail2,ac_email3 = @acemail3 ,ac_cont2 = @accont2,ac_cont3=@accont3,
		ac_contfrm1 = @accontfrm1,ac_contfrm2 = @accontfrm2 ,ac_contfrm3 =@accontfrm3,ac_contfrm4=@accontfrm4,ac_ssevausr =@acssevausr ,ac_ssevapwd = @acssevapwd,ac_limit = @aclimit where sno = @accode	      
	declare @accd int
	select @accd = 0
	select @accd = pcd from brokerdb1.dbo.trans where main_bk = 'OP' and c_j_S_p = 'OP' and pcd = @accode
	if @accd >0 
	   update brokerdb1.dbo.trans set amount = @opbal ,d_c = @opbaldc where pcd = @accd and main_bk = 'OP' and c_j_S_p = 'OP'
	else
	      if @opbal >0   insert into brokerdb1.dbo.trans(main_bk,c_j_s_p,pcd,d_a_t_e,amount,d_c) values ('OP','OP',@accode,@opdt,@opbal,@opbaldc) 

	select @accd = 0
	select @accd = pcd from brokerdb1.dbo.trans where main_bk = 'HOP' and c_j_S_p = 'HOP' and pcd = @accode
	if @accd >0 
	   update brokerdb1.dbo.trans set amount = @hopbal ,d_c = @hopbaldc where pcd = @accd and main_bk = 'HOP' and c_j_S_p = 'HOP'
	else
	      if @opbal >0   insert into brokerdb1.dbo.trans (main_bk,c_j_s_p,pcd,d_a_t_e,amount,d_c) values ('HOP','HOP',@accode,@hopdt,@hopbal,@hopbaldc) 

 SET NOCOUNT ON  
	RETURN






set ANSI_NULLS ON
set QUOTED_IDENTIFIER ON
GO
/****** Object:  StoredProcedure [dbo].[EdtPropmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO




CREATE PROCEDURE [dbo].[EdtPropmst] 	
	(
	@accode int, @acname varchar(50),@acadd1 varchar(50),@acadd2 varchar(50),@acplace int,@acpin varchar(6),@accont varchar(50),@acpho varchar(50),@acphr varchar(50),@acphm varchar(50),@actin varchar(50),@acpan varchar(50),@acemail varchar(50)) 
	
AS	 
	update propmst set ac_name = @acname, ac_add1 = @acadd1,ac_add2 = @acadd2,ac_place = @acplace
	,ac_pin = @acpin,ac_cont = @accont,ac_pho = @acpho,ac_phr = @acphr,ac_phm = @acphm,ac_tin = @actin,
	ac_pan = @acpan,ac_email = @acemail where sno = @accode

 SET NOCOUNT ON 
	RETURN


GO
/****** Object:  StoredProcedure [dbo].[EdtSauda]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[EdtSauda]
	
	(@sno int,@itsno int,@sddate datetime,@slcode int,@sbcode int,@brcode int,@bbcode int,@slcont varchar(50),@sbcont varchar(50),@brcont varchar(250),@bbcont varchar(50),
	@slbrok varchar(1),@sbbrok varchar(1),@brbrok varchar(1),@bbbrok varchar(1),@brok varchar(1), @pono varchar(50),@podate varchar(50),@discrt money,
	@delvfr varchar(50),@delvto varchar(50),@term int,@fromct int , @toct int,@paycond varchar(1),@disccrdrt money,@form varchar(1),@rmks varchar(150),
	@itcode int,@brndcode int,@bag money,@pck money,@ipck varchar(25),@wght money,@qtyexe money,@qtybal money,@gn varchar(1),@krate money,@brate money,@wq varchar(1),		
	@amt money,@slbrkrt money, @slbrktyp varchar(5),@slbrkamt money,@brbrkrt money, @brbrktyp varchar(5),@brbrkamt money,@currt money,@cursym varchar(10),
	@paydet varchar(250),@delvdet varchar(50),@qltydet varchar(50),@bnkdet varchar(250),@arbit varchar(250),@pckunit varchar(10),@pcktype varchar(5),@pckdet varchar(150),@wghtunit varchar(5),@rateper money,@shipmark varchar(200),
	@delvload varchar(25),@origin varchar(50),@add1rmk varchar(35),@add1amt money,@add2rmk varchar(35),@add2amt money,@add3rmk varchar(35),@add3amt money,@apprxwght varchar(50),
	@slrbnkdet varchar(250),@wghtterm varchar(100),@priceterm varchar(50),@inspdet varchar(100),@shipdet varchar(50))	
AS	 
	declare @vvcd int
	declare @vcd int
	select @vcd = 0
	declare @sdsno int,@sd2sno int ,@saudaqty money,@totqtyexecuted money
	select @sdsno = 0
	declare @contsno int
	select @contsno	= 0
	declare @srno int
	select @srno = 0

	if @sno > 0
	BEGIN
		update sauda1 set sd_date = @sddate,sl_code= @slcode,sb_code=@sbcode,br_code=@brcode,bb_code=@bbcode,sl_cont=@slcont,
			sb_cont=@sbcont,br_cont=@brcont,bb_cont=@bbcont,sl_brok=@slbrok,sb_brok=@sbbrok,br_brok=@brbrok,bb_brok=@bbbrok,
			brok_yn=@brok,pono=@pono,podt=@podate,delv_fr=@delvfr,delv_to=@delvto,term=@term,from_ct=@fromct,to_ct=@toct,paycond=@paycond,paydiscrt=@disccrdrt,cform=@form,rmks=@rmks ,
			paydet = @paydet,delvdet =  @delvdet,bankdet = @bnkdet ,arbit = @arbit, cur_rt =@currt ,cur_sym = @cursym,shipmark = @shipmark ,apprxwght =@apprxwght,
			delv_load= @delvload,origin = @origin,add1_rmk =@add1rmk,add1_amt=@add1amt,add2_rmk=@add2rmk,add2_amt=@add2amt,add3_rmk=@add3rmk,add3_amt=@add3amt,
			slr_bnkdet =@slrbnkdet,wght_term = @wghtterm,price_term= @priceterm,insp_det= @inspdet,ship_det = @shipdet,discrt=@discrt where sno = @sno
	end
	if @itsno>0
	Begin
		select @contsno = cont_sno,@srno = sr_no from sauda2 where sno = @itsno 
	
		select @totqtyexecuted = 0

		select @sd2sno = sno from sauda2 where typ = 'SL' and sr_no = @srno and cont_sno = @contsno
	    select @totqtyexecuted= sum(sauda2.rateper) from  sauda2 where sauda2.cont2_sno = @sd2sno group by sauda2.cont2_sno

		update sauda2 set sddate = @sddate,p_code = @slcode,it_code = @itcode,brnd_code = @brndcode,bag=@bag,pck=@pck,ipck =@ipck,wght=@wght,
		g_n=@gn,k_rate = @krate,b_rate=@brate,w_q=@wq,amount=@amt,slbrk_rt=@slbrkrt,slbrk_typ=@slbrktyp,slbrk_amt=@slbrkamt,qty_exe = @totqtyexecuted,qty_bal = @rateper- @totqtyexecuted,
		brbrk_rt=@brbrkrt,brbrk_typ=@brbrktyp,brbrk_amt=@brbrkamt,qltydet = @qltydet,pckunit =@pckunit,pcktype = @pcktype,pckdet =@pckdet,wghtunit =@wghtunit,rateper =@rateper where typ = 'SL' and sr_no = @srno and cont_sno = @contsno

		select @sd2sno = sno from sauda2 where typ = 'SB' and sr_no = @srno and cont_sno = @contsno
	    select @totqtyexecuted= sum(sauda2.rateper) from  sauda2 where sauda2.cont2_sno = @sd2sno group by sauda2.cont2_sno

		update sauda2 set sddate = @sddate,p_code = @sbcode,it_code = @itcode,brnd_code = @brndcode,bag=@bag,pck=@pck,ipck =@ipck,wght=@wght,
		g_n=@gn,k_rate = @krate,b_rate=@brate,w_q=@wq,amount=@amt,slbrk_rt=@slbrkrt,slbrk_typ=@slbrktyp,slbrk_amt=@slbrkamt,qty_exe = @totqtyexecuted, qty_bal = @rateper- @totqtyexecuted,
		brbrk_rt=@brbrkrt,brbrk_typ=@brbrktyp,brbrk_amt=@brbrkamt,qltydet = @qltydet,pckunit =@pckunit,pcktype = @pcktype,pckdet =@pckdet,wghtunit =@wghtunit,rateper =@rateper where typ = 'SB' and sr_no = @srno and cont_sno = @contsno
		
		select @sd2sno = sno from sauda2 where typ = 'BR' and sr_no = @srno and cont_sno = @contsno
	    select @totqtyexecuted= sum(sauda2.rateper) from  sauda2 where sauda2.cont2_sno = @sd2sno group by sauda2.cont2_sno

		update sauda2 set sddate = @sddate,p_code = @brcode,it_code = @itcode,brnd_code = @brndcode,bag=@bag,pck=@pck,ipck =@ipck,wght=@wght,
		g_n=@gn,k_rate = @krate,b_rate=@brate,w_q=@wq,amount=@amt,slbrk_rt=@slbrkrt,slbrk_typ=@slbrktyp,slbrk_amt=@slbrkamt,qty_exe = @totqtyexecuted,qty_bal = @rateper- @totqtyexecuted,
		brbrk_rt=@brbrkrt,brbrk_typ=@brbrktyp,brbrk_amt=@brbrkamt,qltydet = @qltydet,pckunit =@pckunit,pcktype = @pcktype,pckdet =@pckdet,wghtunit =@wghtunit,rateper =@rateper where typ = 'BR' and sr_no = @srno and cont_sno = @contsno
	
		select @sd2sno = sno from sauda2 where typ = 'BB' and sr_no = @srno and cont_sno = @contsno
	    select @totqtyexecuted= sum(sauda2.rateper) from  sauda2 where sauda2.cont2_sno = @sd2sno group by sauda2.cont2_sno
		
		update sauda2 set sddate = @sddate,p_code = @bbcode,it_code = @itcode,brnd_code = @brndcode,bag=@bag,pck=@pck,ipck =@ipck,wght=@wght,
		g_n=@gn,k_rate = @krate,b_rate=@brate,w_q=@wq,amount=@amt,slbrk_rt=@slbrkrt,slbrk_typ=@slbrktyp,slbrk_amt=@slbrkamt,qty_exe = @totqtyexecuted,qty_bal = @rateper- @totqtyexecuted,
		brbrk_rt=@brbrkrt,brbrk_typ=@brbrktyp,brbrk_amt=@brbrkamt,qltydet = @qltydet,pckunit =@pckunit,pcktype = @pcktype,pckdet =@pckdet,wghtunit =@wghtunit,rateper =@rateper where typ = 'BB' and sr_no = @srno and cont_sno = @contsno

	END 

	 SET NOCOUNT ON 
	RETURN
















GO
/****** Object:  StoredProcedure [dbo].[EdtStatemst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


CREATE PROCEDURE [dbo].[EdtStatemst] 	
	(
	@accode int, @acname varchar(50),@acstate varchar(50),@acarea money,@actv varchar(1)) 	
AS	 
	update statemst set state_nm = @acname,state_cap = @acstate,state_area = @acarea ,Active =@actv where sno = @accode

 SET NOCOUNT ON 
	RETURN


GO
/****** Object:  StoredProcedure [dbo].[EdtStationmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS OFF
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[EdtStationmst] 	
	(@accode int,@acname varchar(50),@stcode int ,@dtcode int,@acstd varchar(20),@acpin varchar(6)) 
AS	 
	update stationmst set st_name = @acname, st_state = @stcode , st_district = @dtcode , st_stdcd = @acstd , st_pincode = @acpin   where sno = @accode

 SET NOCOUNT ON 
	RETURN

GO
/****** Object:  StoredProcedure [dbo].[EdtTermmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS OFF
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[EdtTermmst] 	
	(
	@accode int, @acname varchar(40)) 	
AS	 
	update termmst set term = @acname where sno = @accode

 SET NOCOUNT ON 
	RETURN

GO
/****** Object:  StoredProcedure [dbo].[Edttrptmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO






CREATE PROCEDURE [dbo].[Edttrptmst] 	
	(
	@trcode int, @trname varchar(50),@tradd1 varchar(50),@tradd2 varchar(50),@trplace int,@trpin varchar(6),@trcont varchar(50),@trpho varchar(50),@trphr varchar(50),@trphm varchar(50),@trpan varchar(50),@tremail varchar(50)) 
	
AS	 
	update trptmst set tr_name = @trname, tr_add1 = @tradd1,tr_add2 = @tradd2,tr_place = @trplace
	,tr_pin = @trpin,tr_cont = @trcont,tr_pho = @trpho,tr_phr = @trphr,tr_phm = @trphm,
	tr_pan = @trpan,tr_email = @tremail where sno = @trcode

 SET NOCOUNT ON 
	RETURN



set ANSI_NULLS ON
set QUOTED_IDENTIFIER ON

GO
/****** Object:  StoredProcedure [dbo].[EdtVehmst]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS OFF
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[EdtVehmst] 	
	(
	@accode int, @acname varchar(40),@wght money,@vehapprxwght varchar(50),@vehminapprx money,@vehmaxapprx money) 	
AS	 
	update vehmst set veh_name= @acname,veh_wght = @wght,veh_apprxwght=@vehapprxwght,veh_minapprx=@vehminapprx ,veh_maxapprx=@vehmaxapprx  where sno = @accode

 SET NOCOUNT ON 
	RETURN





GO
/****** Object:  StoredProcedure [dbo].[GenerateBill]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO







CREATE PROCEDURE [dbo].[GenerateBill] 	
	(@mnbk varchar(5),@blcocode int,@blyr varchar(10),@date datetime,@date1 datetime,@date2 datetime,@billno int,@retbillno int output,@pwitw as varchar(1)) 
	
AS	 
	set dateformat dmy
	declare @newbillno int
	declare @accd int,@fullqry varchar(8000)
	declare @billamt money
    declare @bp  int,@sno int,@itsno int,@tsno int,@slbrktyp varchar(10)
	Select @tsno = 0
    BEGIN
		UPDATE [brokermast].[dbo].[sauda2] SET [slbrk_amt] =[bag] * [slbrk_rt]  where [slbrk_typ] = 'PBag'
		UPDATE [brokermast].[dbo].[sauda2] SET [slbrk_amt] =[wght] * [slbrk_rt]  where [slbrk_typ] = 'PQtl'
		UPDATE [brokermast].[dbo].[sauda2] SET [slbrk_amt] =round([Amount] * [slbrk_rt]/100,2)  where [slbrk_typ] = '%'
		UPDATE [brokermast].[dbo].[sauda2] SET [slbrk_amt] = [slbrk_rt]  where [slbrk_typ] = 'Fix'

		UPDATE [brokermast].[dbo].[sauda2] SET [brbrk_amt] =[bag] * [brbrk_rt]  where [brbrk_typ] = 'PBag'
		UPDATE [brokermast].[dbo].[sauda2] SET [brbrk_amt] =[wght] * [brbrk_rt]  where [brbrk_typ] = 'PQtl'
		UPDATE [brokermast].[dbo].[sauda2] SET [brbrk_amt] =round([Amount] * [brbrk_rt]/100,2)  where [brbrk_typ] = '%'
		UPDATE [brokermast].[dbo].[sauda2] SET [brbrk_amt] = [brbrk_rt]  where [brbrk_typ] = 'Fix'

		UPDATE [brokermast].[dbo].[sauda2] SET [brk_amt] =[brbrk_amt],[brk_rt] = [brbrk_rt],[brk_typ]=[brbrk_typ] where [typ] = 'BR' OR [typ] = 'BB'
		UPDATE [brokermast].[dbo].[sauda2] SET [brk_amt] =[slbrk_amt],[brk_rt] = [slbrk_rt],[brk_typ]=[slbrk_typ] where [typ] = 'SL' OR [typ] = 'SB'
		
		if @pwitw = 'I'  
		begin
			DECLARE TrigUpdate_Cursor CURSOR For Select p_code,it_code from sauda2 where main_bk = @mnbk AND blvouc_code IS NULL and sddate >= @date1 and sddate <= @date2 and p_code >0 and genebillyn = 'Y' group by p_code,it_code --and genebillyn = 'Y' 
		end
		else
		begin
			DECLARE TrigUpdate_Cursor CURSOR FOR select p_code from sauda2 where main_bk = @mnbk AND blvouc_code IS NULL and sddate >= @date1 and sddate <= @date2 and p_code >0  and genebillyn = 'Y' group by p_code  --and + @qry +  --and genebillyn = 'Y'
		end	
		open TrigUpdate_Cursor

		if @pwitw = 'I'  
		begin
			FETCH NEXT FROM TrigUpdate_Cursor INTO @sno,@itsno
		end
		else
		begin
			FETCH NEXT FROM TrigUpdate_Cursor INTO @sno
		end	
				


		WHILE @@FETCH_STATUS = 0

		BEGIN
		  if @itsno	>0 
	      begin
        	update sauda2 set blyr = @blyr, blcocode = @blcocode ,blvouc_code = @billno,blmain_bk ='BL',blc_j_s_p = 'BL',bldate = @date, blfromdate= @date1,bltodate = @date2  where main_bk = @mnbk AND blvouc_code IS NULL and p_code = @sno and it_code = @itsno and sddate >= @date1 and sddate <= @date2 and genebillyn = 'Y'   /*and chl_vouc_code is not null  */
		  end
		  else
		  begin
			update sauda2 set blyr = @blyr, blcocode = @blcocode ,blvouc_code = @billno,blmain_bk ='BL',blc_j_s_p = 'BL',bldate = @date, blfromdate= @date1,bltodate = @date2  where main_bk = @mnbk AND blvouc_code IS NULL and p_code = @sno and sddate >= @date1 and sddate <= @date2 and genebillyn = 'Y'   /*and chl_vouc_code is not null  */
		  end			
			Select @billamt = sum(brk_amt) from sauda2 where blyr = @blyr and blcocode = @blcocode and blvouc_code = @billno and blmain_bk ='BL' and blc_j_s_p = 'BL'
			
			Select @tsno = [sno] from [brokerdb1].[dbo].[trans] where main_bk = 'HB' and c_j_s_p = 'BL' and vouc_code = @billno and pcd = @sno
			if (@tsno > 0)
			begin
				update [brokerdb1].[dbo].[trans] set d_a_t_e = @date ,pcd = @sno,type = 'Brokerage Bill',nar = 'For the Period ' + convert(char (10), @date1) +' to ' + convert(char (10),@date2)  ,amount = @billamt,d_c = 'D',wrds =dbo.AmountToWords(@billamt) where sno = @tsno				
			end
			else
			begin
				insert into [brokerdb1].[dbo].[trans](main_bk,c_j_s_p,br_code,vouc_code,vouc_chr,d_a_t_e,pcd,type,nar,amount,d_c,wrds) 
				values ('HB','BL',0,@billno,'',@date,@sno,'Brokerage Bill','For the Period ' + convert(char (10),@date1) +' to ' + convert(char (10),@date2) ,@billamt,'D',dbo.AmountToWords(@billamt))
 
			end

		  	Select @retbillno= 999999
			select @billno=@billno+1
		

			if @pwitw = 'I'  
			begin
				FETCH NEXT FROM TrigUpdate_Cursor INTO @sno,@itsno
			end
			else
			begin
				FETCH NEXT FROM TrigUpdate_Cursor INTO @sno
			end	
			
   	    	
		END		
close TrigUpdate_Cursor

DEALLOCATE  TrigUpdate_Cursor

	 SET NOCOUNT ON 
	RETURN @retbillno

end









set ANSI_NULLS ON
set QUOTED_IDENTIFIER ON





set ANSI_NULLS ON
set QUOTED_IDENTIFIER ON



GO
/****** Object:  StoredProcedure [dbo].[SP_outsrear]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


CREATE proc [dbo].[SP_outsrear]    
AS 
declare @summ money,@sdsno int
declare @recamt money,@bargamt money,@expamt money,@clramt money
declare @adjyr varchar(10)
declare @adjcocode int,@contsno int
declare @adjmnbk varchar(5)
declare @adjcjsp varchar(5) 
declare @adjvouccode int
declare @adjvoucchr varchar(1)       
declare @duedt datetime      
BEGIN	
UPDATE  outstanding SET outstanding.outs_rec = 0, outstanding.outs_bal = outstanding.outs_amt- outstanding.outs_rec-outstanding.outs_exp-outstanding.outs_clr

UPDATE  outstanding SET outstanding.outs_rec =0,outstanding.outs_clr= outstanding.outs_bal, outstanding.outs_bal = 0 where  sd_date < '09/30/2015'

update sauda1 set podt = convert(datetime,sd_date,103) where podt = ''
update outstanding set podt = convert(datetime,sd_date,103) where podt = ''


DECLARE TrigUpdate_Cursorout CURSOR FOR select sno from outstanding where main_bk = 'DLV' and sd_date >= '09/30/2015' order by sno
	
open TrigUpdate_Cursorout

FETCH NEXT FROM TrigUpdate_Cursorout INTO @sdsno

WHILE @@FETCH_STATUS = 0

BEGIN
	select @adjyr = yr from outstanding where sno = @sdsno
	select @adjcocode = cocode from outstanding where sno = @sdsno
	select @adjmnbk = main_bk from outstanding where sno = @sdsno
	select @adjcjsp =c_j_s_p from outstanding where sno = @sdsno
	select @adjvouccode = vouc_code from outstanding where sno = @sdsno
	select @adjvoucchr = vouc_chr from outstanding where sno = @sdsno

	select @bargamt= sauda1.barg_amt from  sauda1 where sauda1.yr = @adjyr and sauda1.cocode = @adjcocode and sauda1.main_bk = @adjmnbk and sauda1.c_j_s_p = @adjcjsp and sauda1.vouc_code = @adjvouccode and sauda1.vouc_chr = @adjvoucchr 
	select @contsno= sauda2.cont2_sno from  sauda2 where sauda2.yr = @adjyr and sauda2.cocode = @adjcocode and sauda2.main_bk = @adjmnbk and sauda2.c_j_s_p = @adjcjsp and sauda2.vouc_code = @adjvouccode and sauda2.vouc_chr = @adjvoucchr 

	select @duedt = dateadd(d,outstanding.paydiscrt,outstanding.sd_date) from outstanding where  outstanding.sno = @sdsno  and outstanding.paycond = 'C'
	select @duedt = outstanding.sd_date from outstanding where  outstanding.sno = @sdsno  and outstanding.paycond = 'D'

	select @recamt=0,@expamt=0,@clramt=0
	select @recamt= sum(outstanding.outs_amt),@expamt= sum(outstanding.outs_exp),@clramt= sum(outstanding.outs_clr) from  outstanding where outstanding.adj_yr = @adjyr and outstanding.adj_cocode = @adjcocode and outstanding.adj_main_bk = @adjmnbk and outstanding.adj_c_j_s_p = @adjcjsp and outstanding.adj_vouc_code = @adjvouccode and outstanding.adj_vouc_chr = @adjvoucchr and  outstanding.main_bk = 'PAY' group by outstanding.adj_yr,outstanding.adj_cocode,outstanding.adj_main_bk,outstanding.adj_c_j_s_p,outstanding.adj_vouc_code,outstanding.adj_vouc_chr
	UPDATE    outstanding
	SET      outstanding.outs_amt = @bargamt,outstanding.outs_rec = @recamt,outstanding.outs_exp = @expamt,outstanding.outs_clr = @clramt,outstanding.outs_bal = @bargamt- @recamt-@expamt-@clramt,outstanding.cont_sno = @contsno,outstanding.due_date = @duedt
	fROM         outstanding where outstanding.sno = @sdsno 

	FETCH NEXT FROM TrigUpdate_Cursorout INTO @sdsno

END

close TrigUpdate_Cursorout

DEALLOCATE  TrigUpdate_Cursorout

	SET NOCOUNT ON;

END














GO
/****** Object:  StoredProcedure [dbo].[SP_RecalculateBrok]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO




CREATE PROCEDURE [dbo].[SP_RecalculateBrok] 	
	
	
AS	 
    BEGIN
		UPDATE [brokermast].[dbo].[sauda2] SET [slbrk_amt] =[bag] * [slbrk_rt]  where [slbrk_typ] = 'PBag'
		UPDATE [brokermast].[dbo].[sauda2] SET [slbrk_amt] =[wght] * [slbrk_rt]  where [slbrk_typ] = 'PQtl'
		UPDATE [brokermast].[dbo].[sauda2] SET [slbrk_amt] =round([Amount] * [slbrk_rt]/100,2)  where [slbrk_typ] = '%'
		UPDATE [brokermast].[dbo].[sauda2] SET [slbrk_amt] = [slbrk_rt]  where [slbrk_typ] = 'Fix'

		UPDATE [brokermast].[dbo].[sauda2] SET [brbrk_amt] =[bag] * [brbrk_rt]  where [brbrk_typ] = 'PBag'
		UPDATE [brokermast].[dbo].[sauda2] SET [brbrk_amt] =[wght] * [brbrk_rt]  where [brbrk_typ] = 'PQtl'
		UPDATE [brokermast].[dbo].[sauda2] SET [brbrk_amt] =round([Amount] * [brbrk_rt]/100,2)  where [brbrk_typ] = '%'
		UPDATE [brokermast].[dbo].[sauda2] SET [brbrk_amt] = [brbrk_rt]  where [brbrk_typ] = 'Fix'

		UPDATE [brokermast].[dbo].[sauda2] SET [brk_amt] =[brbrk_amt],[brk_rt] = [brbrk_rt],[brk_typ]=[brbrk_typ] where [typ] = 'BR' OR [typ] = 'BB'
		UPDATE [brokermast].[dbo].[sauda2] SET [brk_amt] =[slbrk_amt],[brk_rt] = [slbrk_rt],[brk_typ]=[slbrk_typ] where [typ] = 'SL' OR [typ] = 'SB'
		
 

	 SET NOCOUNT ON 

end







GO
/****** Object:  StoredProcedure [dbo].[SP_sauda2rear]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO




CREATE proc [dbo].[SP_sauda2rear]    
	(
	@bltype varchar(1),@cocode int) 	
AS 
declare @summ money,@sdsno int
update sauda2 set qty_rem = 0 where qty_rem is null 

UPDATE sauda2 SET p_code = sauda1.SL_code FROM sauda1 INNER JOIN sauda2 ON sauda1.main_bk = sauda2.main_bk AND sauda1.c_j_s_p = sauda2.c_j_s_p AND sauda1.vouc_code = sauda2.vouc_code AND sauda1.vouc_chr = sauda2.vouc_chr AND sauda1.cocode = sauda2.cocode AND sauda1.yr = sauda2.yr WHERE (sauda2.typ = 'SL') and sauda2.cocode = @cocode
UPDATE sauda2 SET p_code = sauda1.BR_code FROM sauda1 INNER JOIN sauda2 ON sauda1.main_bk = sauda2.main_bk AND sauda1.c_j_s_p = sauda2.c_j_s_p AND sauda1.vouc_code = sauda2.vouc_code AND sauda1.vouc_chr = sauda2.vouc_chr AND sauda1.cocode = sauda2.cocode AND sauda1.yr = sauda2.yr WHERE (sauda2.typ = 'BR') and sauda2.cocode = @cocode
UPDATE sauda2 SET p_code = sauda1.SB_code FROM sauda1 INNER JOIN sauda2 ON sauda1.main_bk = sauda2.main_bk AND sauda1.c_j_s_p = sauda2.c_j_s_p AND sauda1.vouc_code = sauda2.vouc_code AND sauda1.vouc_chr = sauda2.vouc_chr AND sauda1.cocode = sauda2.cocode AND sauda1.yr = sauda2.yr WHERE (sauda2.typ = 'SB') and sauda2.cocode = @cocode
UPDATE sauda2 SET p_code = sauda1.BB_code FROM sauda1 INNER JOIN sauda2 ON sauda1.main_bk = sauda2.main_bk AND sauda1.c_j_s_p = sauda2.c_j_s_p AND sauda1.vouc_code = sauda2.vouc_code AND sauda1.vouc_chr = sauda2.vouc_chr AND sauda1.cocode = sauda2.cocode AND sauda1.yr = sauda2.yr WHERE (sauda2.typ = 'BB') and sauda2.cocode = @cocode

BEGIN	
if @bltype = 'W' 
	begin
		UPDATE    sauda2 SET sauda2.qty_exe  =0, sauda2.qty_bal = sauda2.wght where cocode = @cocode
	end
else
	if @bltype = 'V' 
		begin
			UPDATE    sauda2 SET sauda2.qty_exe  =0, sauda2.qty_bal = sauda2.rateper where cocode = @cocode
		end
	else
		begin
			UPDATE    sauda2 SET sauda2.qty_exe  =0, sauda2.qty_bal = sauda2.bag where cocode = @cocode
		end


DECLARE TrigUpdate_Cursor CURSOR FOR select sno from sauda2 where main_bk = 'SD' and cocode = @cocode order by sno
	
open TrigUpdate_Cursor

FETCH NEXT FROM TrigUpdate_Cursor INTO @sdsno

WHILE @@FETCH_STATUS = 0

BEGIN
	select @summ=0
	if @bltype = 'W' 
		begin
			select @summ = sum(sauda2.wght) from  sauda2 where sauda2.cont2_sno = @sdsno and cocode = @cocode group by sauda2.cont2_sno
		end
	else
		if @bltype = 'V' 
			begin
				select @summ = sum(sauda2.rateper) from  sauda2 where sauda2.cont2_sno = @sdsno and cocode = @cocode group by sauda2.cont2_sno
			end
		else
			begin
				select @summ = sum(sauda2.bag) from  sauda2 where sauda2.cont2_sno = @sdsno and cocode = @cocode group by sauda2.cont2_sno
			end
	UPDATE    sauda2
	SET              sauda2.qty_exe = @summ
	fROM         sauda2 where sauda2.sno = @sdsno and main_bk = 'SD' and cocode = @cocode
	FETCH NEXT FROM TrigUpdate_Cursor INTO @sdsno
end
UPDATE    sauda2 SET  sauda2.qty_bal = sauda2.qty_bal -(sauda2.qty_exe+sauda2.qty_rem) where cocode = @cocode

close TrigUpdate_Cursor

DEALLOCATE  TrigUpdate_Cursor

	SET NOCOUNT ON;

END





set ANSI_NULLS ON
set QUOTED_IDENTIFIER ON



set ANSI_NULLS ON
set QUOTED_IDENTIFIER ON


GO
/****** Object:  StoredProcedure [dbo].[Uploaddata]    Script Date: 13/08/2026 06:48:28 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO



CREATE PROCEDURE [dbo].[Uploaddata]
AS
BEGIN
DECLARE @sdsno int,@ssvsno int
DECLARE TrigUpdate_Cursor CURSOR FOR select sno from sauda2 order by sno

declare @custname char(50),@loginname char(50),@yr char(10) ,@cocode int ,@main_bk char(5) ,@c_j_s_p char(5) ,@vouc_code int 
declare @vouc_chr char(1) ,@date datetime ,@Seller char(100) ,@SellerBroker char(100) ,@Buyer char(100) ,@BuyerBroker char(100) ,@Billno char(50) ,@Billdt char(10) 
declare @Term char(25) ,@paycond char(1) ,@paydiscrt money ,@rmks char(150) ,@bill_amt money ,@mot_no char(35) ,@frght money ,@frght_rt money ,@frght_adv money ,@barg_amt money ,@Item char(50) ,@Brand char(50) ,@bag money ,@pck money ,@ipck char(25) ,@wght money ,@qty_exe money ,@qty_bal money 
declare @g_n char(1) ,@k_rate money ,@b_rate money ,@w_q char(1) ,@amount money ,@slbrk_rt money ,@slbrk_typ char(5) ,@slbrk_amt money ,@brbrk_rt money ,@brbrk_typ char(5) ,@brbrk_amt money ,@blyr char(10) 
declare @blcocode int ,@blmain_bk char(5) ,@blc_j_s_p char(5) ,@blvouc_code int ,@blvouc_chr char(1) ,@sr_no int
	
open TrigUpdate_Cursor

FETCH NEXT FROM TrigUpdate_Cursor INTO @sdsno

WHILE @@FETCH_STATUS = 0

BEGIN
	
SELECT  @loginname= accountmst.ac_ssevausr, @main_bk= sauda1.main_bk,@c_j_s_p = sauda1.c_j_s_p,@vouc_code= sauda1.vouc_code, @vouc_chr= sauda1.vouc_chr, @cocode= sauda1.cocode,@yr = sauda1.yr, @seller = RTRIM(accountmst_1.ac_name) + ',' + RTRIM(stationmst.st_name) ,
					 @SellerBroker = RTRIM(accountmst_2.ac_name) + ',' + RTRIM(stationmst_1.st_name) , @Buyer= RTRIM(accountmst_3.ac_name) + ',' + RTRIM(stationmst_2.st_name) ,@BuyerBroker = RTRIM(accountmst_4.ac_name) + ',' + RTRIM(stationmst_3.st_name) ,@Item =itemmst.item_nm,
                      @Brand = brandmst.brand_name , @Date =  sauda1.sd_date , @BillNo = sauda1.pono , @Billdt = sauda1.podt, @Term = termmst.term ,@Paycond = sauda1.paycond , @paydiscrt = sauda1.paydiscrt , @rmks =  sauda1.rmks ,@bill_amt = sauda1.bill_amt , @mot_no = sauda1.mot_no ,@frght= sauda1.frght , @frght_rt= sauda1.frght_rt ,
                      @frght_adv = sauda1.frght_adv , @barg_amt = sauda1.barg_amt ,@Bag = sauda2.bag , @Pck = sauda2.pck , @Wght = sauda2.wght , @Qty_exe = sauda2.qty_exe ,@Qty_bal = sauda2.qty_bal, @G_n= sauda2.g_n , @K_rate= sauda2.k_rate ,@B_rate =   sauda2.b_rate , @W_Q = sauda2.w_q , @Amount =  sauda2.amount,
                      @Slbrk_rt = sauda2.slbrk_rt ,@Slbrk_typ = sauda2.slbrk_typ ,@Slbrk_amt= sauda2.slbrk_amt , @Brbrk_rt = sauda2.brbrk_rt , @Brbrk_typ = sauda2.brbrk_typ ,@Brbrk_amt = sauda2.brbrk_amt , @Blyr= sauda2.blyr , @Blcocode = sauda2.blcocode ,@blmain_bk = sauda2.blmain_bk ,@Blc_j_s_p = sauda2.blc_j_s_p , @Blvouc_code = sauda2.blvouc_code ,@blvouc_chr= sauda2.blvouc_chr ,@sr_no = sr_no
						FROM         sauda1 INNER JOIN
                      sauda2 ON sauda1.yr = sauda2.yr AND sauda1.cocode = sauda2.cocode AND sauda1.main_bk = sauda2.main_bk AND sauda1.c_j_s_p = sauda2.c_j_s_p AND 
                      sauda1.vouc_code = sauda2.vouc_code AND sauda1.vouc_chr = sauda2.vouc_chr INNER JOIN
                      accountmst ON sauda2.p_code = accountmst.sno INNER JOIN
                      itemmst ON sauda2.it_code = itemmst.sno LEFT OUTER JOIN
                      termmst ON sauda1.term = termmst.sno LEFT OUTER JOIN
                      brandmst ON sauda2.brnd_code = brandmst.sno LEFT OUTER JOIN
                      stationmst AS stationmst_3 RIGHT OUTER JOIN
                      accountmst AS accountmst_4 ON stationmst_3.sno = accountmst_4.ac_place ON sauda1.bb_code = accountmst_4.sno LEFT OUTER JOIN
                      stationmst AS stationmst_2 RIGHT OUTER JOIN
                      accountmst AS accountmst_3 ON stationmst_2.sno = accountmst_3.ac_place ON sauda1.br_code = accountmst_3.sno LEFT OUTER JOIN
                      stationmst AS stationmst_1 RIGHT OUTER JOIN
                      accountmst AS accountmst_2 ON stationmst_1.sno = accountmst_2.ac_place ON sauda1.sb_code = accountmst_2.sno LEFT OUTER JOIN
                      stationmst RIGHT OUTER JOIN
                      accountmst AS accountmst_1 ON stationmst.sno = accountmst_1.ac_place ON sauda1.sl_code = accountmst_1.sno where sauda2.sno = @sdsno
	select @ssvsno =0
--   select @ssvsno = [sseva].[dbo].[data].sno where [sseva].[dbo].[data].main_bk = @main_bk and [sseva].[dbo].[data].c_j_s_p = @c_j_s_p and [sseva].[dbo].[data].vouc_code = @vouc_code
--		and [sseva].[dbo].[data].co_code = @cocode and [sseva].[dbo].[data].yr = @yr and [sseva].[dbo].[data].sr_no = @sr_no
  if (@ssvsno = 0 )
	begin
		INSERT INTO [69.162.86.226].[sseva].[dbo].[data]
			   (custname,loginname,yr,cocode,main_bk,c_j_s_p,vouc_code,vouc_chr,date,Seller,SellerBroker,Buyer,BuyerBroker,
				Billno,Billdt,Term,paycond,paydiscrt,rmks,bill_amt,mot_no,frght,frght_rt,frght_adv,barg_amt,Item,Brand,bag,
				pck,ipck,wght,qty_exe,qty_bal,g_n,k_rate,b_rate,w_q,amount,slbrk_rt,slbrk_typ,slbrk_amt,brbrk_rt,brbrk_typ,
				brbrk_amt,blyr,blcocode,blmain_bk,blc_j_s_p,blvouc_code,blvouc_chr,srno)
		 VALUES
			(@custname,@loginname,@yr,@cocode,@main_bk,@c_j_s_p,@vouc_code,@vouc_chr,@date,@Seller,@SellerBroker,@Buyer,@BuyerBroker,
			 @Billno,@Billdt,@Term,@paycond,@paydiscrt,@rmks,@bill_amt,@mot_no,@frght,@frght_rt,@frght_adv,@barg_amt,@Item,@Brand,@bag,
			 @pck,@ipck,@wght,@qty_exe,@qty_bal,@g_n,@k_rate,@b_rate,@w_q,@amount,@slbrk_rt,@slbrk_typ,@slbrk_amt,@brbrk_rt,@brbrk_typ,
			 @brbrk_amt,@blyr,@blcocode,@blmain_bk,@blc_j_s_p,@blvouc_code,@blvouc_chr,@sr_no)
		end
	FETCH NEXT FROM TrigUpdate_Cursor INTO @sdsno
end

close TrigUpdate_Cursor

DEALLOCATE  TrigUpdate_Cursor

	SET NOCOUNT ON;

END


GO
USE [master]
GO
ALTER DATABASE [brokermast] SET  READ_WRITE 
GO
