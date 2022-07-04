# Worldie App
    This will become a world buidling social applicaiton. Users are able to create different works. while producing works they are able to create others for later use. 

    instead of keeping worlds and races on paper, this will allow users to visualize connections. these connections will be able to show when someone used and item and its "history"

    example:

    i create a sword "Blade of Code" it was made by XYZ on planet ABC. it was wused by PEOPLE. PERSON currently has it.

    the blade of code is the current work im working on

    -   XYZ is someone who made it, i can give them a name and a few traits at this time
    -   ABC is a world, quick create a name and give some traits
    -   PEOPLE and PERSON are who have used it and have it. these would be connected to other works made


# Overview:
    this application has 4 unique featues. each will be built in phases
    
    - Custom text editor
        - Worldie text editror will be cutomer made to allow various functions
        - normal text editor procedures (new file, open, save, save as)
        - searchs string for already created works in database and adds connections
        - forms need to be dynamic

    - Works
        - Bread and butter of Worldie
        - Each work is a unique noun that the user creates.
        - works will be produced from forms created
        - templates will be generic
        - dynamic works allow return attributes of parent work 
       
    
    - ORM database
        - the database will house each work, description of each element. 
        - connections witll be based off of using the names of nouns in your data base
        - visualize connections between items

    - Web Applicaiton
        - this will end up being hosted on a web applicaiton
        - pages will house each work
        - connection/ visualize to be able to better see connections

# Phases
    Each phase will complete a differnt function of the worldie app

    - Phase 0: Creating Base for data dump

    - Phase 1: Data dump
        - this phases is need to gather raw keys from users. when users create works, what are the traits? ex. Name, Title, Job, Weapons, Feel. 

        - once gathered need to find the most common for each work type(world, race, nouns)

        - create forms based off each work

    - Phase 2: Structured dump
        - Use the forms and current use of JSON to create tables
        
        - Use SQLAlchemy to create ORM database

        - Use Postgre for actual storage

        - this phase will be used to test the forms and the returned data. once simulated then need to create storage. SQL and POSTGRE will be used. need to find a way for this to be used by others. (start of small web app?)
