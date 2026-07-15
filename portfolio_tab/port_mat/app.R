# ============================================================
# Shrink Test Histogram (Shiny App)
# - Upload an Excel file that contains required columns:
#     1) "Avg Shrink"
#     2) "Species"
# - Display a histogram (COUNT-scaled) with an overlaid normal curve
# - Provide BOTH:
#     - Bin width control
#     - Number of bins control (optional via toggle)
# - Provide X-axis range control (optional via toggle)
# - Provide a downloadable Excel template (pre-formatted) stored with the app
#
# Notes for shinyapps.io:
# - Ensure "Shrink_Test_Input.xlsx" is in the SAME folder as app.R
# - It will be bundled and deployed with the application
# ============================================================

# -----------------------------
# Libraries
# -----------------------------
library(shiny)
library(tidyverse)  # optional; ok to keep
library(readxl)     # read_excel()
library(ggplot2)    # plotting

# -----------------------------
# UI (User Interface)
# -----------------------------
ui <- fluidPage(
  titlePanel("Shrink Test Histogram"),
  
  sidebarLayout(
    sidebarPanel(
      fileInput(
        inputId = "file",
        label   = "Drag and drop a properly formatted Excel file (.xlsx)",
        accept  = c(".xlsx")
      ),
      
      downloadButton("dl_template", "Download Excel Template"),
      tags$hr(),
      
      # Choose whether to control histogram using Bin Width or Number of Bins
      radioButtons(
        inputId = "bin_mode",
        label   = "Histogram control mode",
        choices = c("Bin width" = "bw", "Number of bins" = "bins"),
        selected = "bw",
        inline  = FALSE
      ),
      
      # Bin width control (shown only when bin_mode == "bw")
      conditionalPanel(
        condition = "input.bin_mode == 'bw'",
        numericInput(
          inputId = "bw",
          label   = "Bin width (inches)",
          value   = 0.25,
          min     = 0.01,
          step    = 0.01
        )
      ),
      
      # Number of bins control (shown only when bin_mode == "bins")
      conditionalPanel(
        condition = "input.bin_mode == 'bins'",
        sliderInput(
          inputId = "bins",
          label   = "Number of bins",
          min     = 5,
          max     = 80,
          value   = 20,
          step    = 1
        )
      ),
      
      tags$hr(),
      
      # Optional X-axis range controls
      checkboxInput(
        inputId = "x_manual",
        label   = "Manually set X-axis range",
        value   = FALSE
      ),
      
      conditionalPanel(
        condition = "input.x_manual == true",
        fluidRow(
          column(
            width = 6,
            numericInput(
              inputId = "x_min",
              label   = "X min",
              value   = 0,     # placeholder; updated after file load
              step    = 0.01
            )
          ),
          column(
            width = 6,
            numericInput(
              inputId = "x_max",
              label   = "X max",
              value   = 1,     # placeholder; updated after file load
              step    = 0.01
            )
          )
        ),
        helpText("Tip: leave unchecked to use the data range automatically.")
      ),
      actionButton("help_btn", "How to use"),
      helpText("Required columns: 'Avg Shrink' and 'Species'")
    ),
    
    mainPanel(
      plotOutput("histPlot", height = "600px"),
      verbatimTextOutput("status")
    )
  )
)

# -----------------------------
# Server (Backend logic)
# -----------------------------
server <- function(input, output, session) {
  
  #Add in help section
  observeEvent(input$help_btn, {
    showModal(modalDialog(
      title = "How to use Shrink Test Histogram",
      easyClose = TRUE,
      size = "l",
      tags$ol(
        tags$li("Click 'Download Excel Template'."),
        tags$li("Enter data Avg_Shrink will be calculated. However the program needs some values in the Species col as well."),
        tags$li("Upload the file (.xlsx) using the file picker."),
        tags$li("Select histogram control mode:"),
        tags$ul(
          tags$li(tags$b("Bin width:"), " sets the width of each bin (inches)."),
          tags$li(tags$b("Number of bins:"), " sets how many bins span the data range.")
        ),
        tags$li("Optional: set the X-axis range: check 'Manually set X-axis range' and enter X min / X max."),
        tags$li("Read the status panel under the chart to confirm your settings.")
      ),
      tags$p(tags$small("X-axis range is a zoom of the view; it does not delete data from calculations. If you need any more help shoot me an email: Jaredbean208@gmail.com"))
    ))
  })
  
  
  # ----------------------------------------------------------
  # 1) Download handler: serve a pre-built Excel template file
  # ----------------------------------------------------------
  output$dl_template <- downloadHandler(
    filename = function() {
      "Shrink_Test_Input.xlsx"
    },
    content = function(file) {
      template_path <- "Shrink_Test_Input.xlsx"  # must exist next to app.R
      
      validate(
        need(
          file.exists(template_path),
          paste0(
            "Template file not found on server: ", template_path,
            "\nMake sure it is deployed in the same folder as app.R."
          )
        )
      )
      
      file.copy(from = template_path, to = file, overwrite = TRUE)
    },
    contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  )
  
  # ----------------------------------------------------------
  # 2) Reactive data loader: read and validate the uploaded file
  # ----------------------------------------------------------
  df <- reactive({
    req(input$file)
    
    dat <- read_excel(input$file$datapath)
    
    validate(
      need(
        "Avg Shrink" %in% names(dat),
        "Missing required column: 'Avg Shrink'. Please upload a correctly formatted file."
      ),
      need(
        "Species" %in% names(dat),
        "Missing required column: 'Species'. Please upload a correctly formatted file."
      )
    )
    
    dat
  })
  
  # ----------------------------------------------------------
  # 2b) When a file loads, auto-fill X min/max with data range
  # ----------------------------------------------------------
  observeEvent(df(), {
    dat <- df()
    x <- dat$`Avg Shrink`
    x <- x[!is.na(x)]
    
    req(length(x) > 1)
    rng <- range(x)
    
    updateNumericInput(session, "x_min", value = rng[1])
    updateNumericInput(session, "x_max", value = rng[2])
  })
  
  # ----------------------------------------------------------
  # 3) Plot output: histogram (COUNT) + normal curve (COUNT-scaled)
  # ----------------------------------------------------------
  output$histPlot <- renderPlot({
    dat <- df()
    
    # Avg Shrink numeric vector (remove NAs)
    x <- dat$`Avg Shrink`
    x <- x[!is.na(x)]
    
    validate(need(length(x) > 1, "Not enough non-missing 'Avg Shrink' values to plot."))
    
    # Species title text
    sp <- unique(na.omit(dat$Species))
    sp_txt <- if (length(sp) == 0) {
      "Unknown Species"
    } else if (length(sp) == 1) {
      as.character(sp)
    } else {
      paste0(paste(as.character(sp), collapse = ", "), " (multiple)")
    }
    
    # Decide bins / bw based on mode
    rng <- range(x)
    validate(need(is.finite(rng[1]) && is.finite(rng[2]), "Avg Shrink contains no finite values."))
    
    # Decide x-axis limits
    if (isTRUE(input$x_manual)) {
      validate(
        need(is.finite(input$x_min) && is.finite(input$x_max), "X min and X max must be finite."),
        need(input$x_min < input$x_max, "X min must be less than X max.")
      )
      xlim <- c(input$x_min, input$x_max)
    } else {
      xlim <- rng
    }
    
    if (input$bin_mode == "bw") {
      bw <- input$bw
      validate(need(is.finite(bw) && bw > 0, "Bin width must be > 0."))
      
      # choose a bins value only for display; histogram will use bw directly
      bins_display <- ceiling(diff(rng) / bw)
      bins_display <- max(bins_display, 1)
      
      p <- ggplot(dat, aes(x = `Avg Shrink`)) +
        geom_histogram(
          binwidth = bw,
          boundary = 0,
          closed   = "left",
          fill     = "steelblue",
          color    = "white",
          alpha    = 0.7
        ) +
        stat_function(
          fun = function(z) {
            n  <- length(x)
            mu <- mean(x)
            s  <- sd(x)
            if (is.na(s) || s == 0) return(rep(NA_real_, length(z)))
            dnorm(z, mean = mu, sd = s) * n * bw
          },
          color = "firebrick",
          linewidth = 1.2
        ) +
        labs(
          title = paste0(
            "Histogram of Avg Shrink (binwidth = ", bw, " in; ~", bins_display,
            " bins) — Species: ", sp_txt
          ),
          x = "Avg Shrink (inches)",
          y = "Count"
        ) +
        theme_minimal()
      
    } else {
      bins <- input$bins
      validate(need(is.finite(bins) && bins >= 1, "Number of bins must be >= 1."))
      
      bw <- diff(rng) / bins
      validate(need(is.finite(bw) && bw > 0, "Data range is zero; cannot compute bins."))
      
      p <- ggplot(dat, aes(x = `Avg Shrink`)) +
        geom_histogram(
          bins     = bins,
          boundary = 0,
          closed   = "left",
          fill     = "steelblue",
          color    = "white",
          alpha    = 0.7
        ) +
        stat_function(
          fun = function(z) {
            n  <- length(x)
            mu <- mean(x)
            s  <- sd(x)
            if (is.na(s) || s == 0) return(rep(NA_real_, length(z)))
            dnorm(z, mean = mu, sd = s) * n * bw
          },
          color = "firebrick",
          linewidth = 1.2
        ) +
        labs(
          title = paste0("Histogram of Avg Shrink (", bins, " bins) — Species: ", sp_txt),
          x = "Avg Shrink (inches)",
          y = "Count"
        ) +
        theme_minimal()
    }
    
    # Shared theme polishing + apply x-axis range without dropping data
    p +
      coord_cartesian(xlim = xlim) +
      theme(
        axis.text.x  = element_text(size = 12),
        axis.title.x = element_text(size = 15),
        axis.text.y  = element_text(size = 12),
        axis.title.y = element_text(size = 15),
        plot.title   = element_text(size = 18, face = "bold", hjust = 0)
      )
  })
  
  # ----------------------------------------------------------
  # 4) Status output: confirm what was loaded / chosen
  # ----------------------------------------------------------
  output$status <- renderPrint({
    req(input$file)
    dat <- df()
    
    cat("Loaded file:", input$file$name, "\n")
    cat("Rows:", nrow(dat), "  Cols:", ncol(dat), "\n")
    cat("Mode:", ifelse(input$bin_mode == "bw", "Bin width", "Number of bins"), "\n")
    
    if (input$bin_mode == "bw") {
      cat("Bin width:", input$bw, "\n")
    } else {
      cat("Bins:", input$bins, "\n")
    }
    
    if (isTRUE(input$x_manual)) {
      cat("X-axis range (manual):", input$x_min, "to", input$x_max, "\n")
    } else {
      cat("X-axis range: auto (data range)\n")
    }
  })
}

# -----------------------------
# Run the application
# -----------------------------
shinyApp(ui, server)