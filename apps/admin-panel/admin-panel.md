# Taxonomy admin panel


## Overview
An interactive electron desktop application that allows the admins to edit and publish new taxonomies and/or change categories

It is supposed to be the all-in-one place where the fragments from other applications are consolidated in a meaningull flow - for now just the catalog application

## Intended functionality

The electron application would let an administrator to
- see a list of categories and the items in them
- quickly move items from one category to another
- quickly create variants for an item
- author new categories
- publish new taxonomies
- publish a new catalog

## Third party applications

Every application in this repo is supposed to be self contained, so when the admin panel interacts with other applications it will do so by api calls. However, this needs to be abstracted because other applications don't support api calls currently, only command line tools - which is good, because the project is only hosted locally for now. 

When abstracting contracts between the admin-panel and other applications, an .api.ts file will be created. The pattern here is that there is a clear distinction between what the third party applications send to us - the data model, and the way we are using and describing that structure internally in the admin panel - the domain model.


### Example abstractions

The admin panel needs to read the versions, taxonomy, variants and authored items from the taxomy project

```
taxonomy.service.ts            
taxonomy.getVersions.api.ts    
taxonomy.getTaxonmy.api.ts
taxonomy.publish.api.ts
... 
```

Each api call is not isolated, and contracts can be degined
The get* api calls have the json file format as their contract
The actions have the yarn command parameters as their contract

Most important, the .api.ts just read files directly from disk or execute yarn commands
There is not HTTP transport going on, only stdout

## Versioning


### Taxonomy

Initially the taxonmy versioning was only designed around being done once per league. This changes with this project. 3.29.json now becomes 3.29.1.json, and so on for all the authored items, variants and so on. Each new version will be based on a previous PUBLISHED version

3.29.12 - published, available to the users
3.29.13 - unpunlished, based on 3.29.12
3.29.13 - unpublished, based on 3.29.12, cannot be based on 3.29.13 because it is not published

Every time a new "taxonomy" package is generated, a physical copy of the taxonomy files is created

A new command needs to be created for this - `yarn taxonomy:create --parent=3.29.12`

Everything will be stored in .s3/taxonomy
The latest published version will be readable at .s3/taxonomy/latest/*.json

### Catalog

The catalog was initially versioned as if it was part of a versioned patch - that was wrong. There is one catalog per league, so the key for the catalog is the league name not the patch version
By default, catalog uses the latest available taxonomy to generate the artifacts

Everything will be stored in .s3/catalog (as it already does)
The latest version will be readable at .s3/catalog/latest/*.json
The catalog is supposed to work as before - every new hourly run will create a new folder and redownload everything in the bronze tier
An option to force redownload the certain providers will be implemented
`yarn catalog --league=Allflame --force=taxonomy,ggg,poewatch,...`

